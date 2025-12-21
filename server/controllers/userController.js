const { User, Tenant } = require('../models');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const csv = require('csv-parser');
const { sendEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');

// Get all users (admins and clients)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const whereClause = { tenantId: req.user.tenantId };
    if (role) whereClause.role = role;
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();
  console.log('Creating user:', { name, email: normalizedEmail, role, phone });

  try {
    const existingUser = await User.findOne({ where: { email: normalizedEmail, tenantId: req.user.tenantId } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let passwordHash = null;
    
    if (role === 'admin') {
        if (!password) return res.status(400).json({ message: 'Password is required for Admin users' });
        passwordHash = await bcrypt.hash(password, 10);
    } else {
        // Clients: Optional password
        if (password && password.trim() !== '') {
            passwordHash = await bcrypt.hash(password, 10);
        }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: role || 'client',
      phone,
      tenantId: req.user.tenantId
    });

    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    console.log('User created:', user.id);
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error creating user', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findOne({ where: { id, tenantId: req.user.tenantId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.importClients = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let importedCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Clean up file
      try {
        if (fs.existsSync(req.file.path)) {
             fs.unlinkSync(req.file.path);
        }
      } catch (cleanupErr) {
        console.error('Error cleaning up file:', cleanupErr);
      }

      for (const row of results) {
        // Case-insensitive key lookup
        const findKey = (obj, key) => Object.keys(obj).find(k => k.toLowerCase().trim() === key.toLowerCase());
        
        const nameKey = findKey(row, 'name');
        const emailKey = findKey(row, 'email');
        const phoneKey = findKey(row, 'phone');

        const name = nameKey ? row[nameKey] : null;
        const email = emailKey ? row[emailKey] : null;
        const phone = phoneKey ? row[phoneKey] : null;

        if (!name || !email) {
          console.log('Skipping row missing name or email:', row);
          errors.push(`Skipped row: Missing Name or Email`);
          continue;
        }

        try {
            const normalizedEmail = email.toLowerCase().trim();
            const existingUser = await User.findOne({ where: { email: normalizedEmail, tenantId: req.user.tenantId } });
            
            if (!existingUser) {
                await User.create({
                    name,
                    email: normalizedEmail,
                    phone: phone || null,
                    role: 'client',
                    password_hash: null,
                    tenantId: req.user.tenantId
                });
                importedCount++;
            } else {
                errors.push(`Skipped ${email}: User already exists`);
            }
        } catch (err) {
            errors.push(`Failed to import ${email}: ${err.message}`);
        }
      }

      res.json({ 
        message: 'Import processed', 
        importedCount, 
        totalRows: results.length,
        errors 
      });
    })
    .on('error', (error) => {
      res.status(500).json({ message: 'Error parsing CSV', error: error.message });
    });
};

// Send invitation emails to selected clients
exports.sendInvitations = async (req, res) => {
  const { clientIds } = req.body;

  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'No client IDs provided' });
  }

  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const clients = await User.findAll({
      where: {
        id: clientIds,
        role: 'client',
        tenantId
      }
    });

    if (clients.length === 0) {
      return res.status(404).json({ message: 'No valid clients found' });
    }

    const companyName = tenant.name || 'Your Company';
    const fromEmail = tenant.sendgridFromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    // clientUrl already includes slug (e.g., http://localhost:5173/tenant/<slug>)
    const baseUrl = tenant.clientUrl || process.env.CLIENT_URL || 'http://localhost:5173/tenant';

    let sentCount = 0;
    let failedCount = 0;

    // Send emails to each client with their personalized link
    for (const client of clients) {
      try {
        // Generate a client-specific token for this client
        const token = jwt.sign(
          { 
            clientId: client.id,
            clientEmail: client.email,
            clientName: client.name,
            tenantId,
            tenantSlug: tenant.slug,
            type: 'client_referral_link'
          },
          process.env.JWT_SECRET || 'secret_key',
          { expiresIn: '30d' }
        );

        // Create personalized link that will pre-fill their information
        const personalizedLink = `${baseUrl.replace(/\/$/, '')}/generate-referral?token=${token}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
            </div>
            
            <div style="text-align: center; background-color: #eff6ff; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #1e40af; margin-top: 0; font-size: 24px;">Earn Rewards by Referring Friends!</h1>
              <p style="color: #374151; font-size: 16px;">
                Start earning rewards today with our referral program.
              </p>
            </div>

            <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              <p>Hi ${client.name},</p>
              <p>We're excited to introduce our <strong>Referral Reward Program</strong>! As a valued client, you can now earn amazing rewards simply by sharing ${companyName} with your friends and family.</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; margin-top: 0;">How It Works:</h3>
                <ol style="padding-left: 20px; color: #374151;">
                  <li>Click the button below to access your personalized referral form</li>
                  <li>Your information will be pre-filled automatically</li>
                  <li>Generate your unique referral link and share it with friends and family</li>
                  <li>When they request an estimate using your link, you earn rewards!</li>
                  <li>Rewards are activated once their service is completed</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${personalizedLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Get Started - Generate Your Referral Link
                </a>
              </div>

              <p style="margin-top: 20px;">It's that simple! Click the button above to create your referral link and start earning rewards today. Your information will be automatically filled in for your convenience.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>Thank you for being a valued ${companyName} client!</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: client.email,
          subject: `Start Earning Rewards with ${companyName}! 🎁`,
          html: emailHtml,
          fromEmail,
          fromName: companyName
        });

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${client.email}:`, emailError);
        failedCount++;
      }
    }

    res.json({
      message: 'Invitation email process completed',
      sentCount,
      failedCount,
      total: clients.length
    });
  } catch (error) {
    console.error('Error sending invitation emails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate a client-specific referral link token
exports.generateClientReferralLink = async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (client.role !== 'client') {
      return res.status(400).json({ message: 'User is not a client' });
    }

    const tenant = await Tenant.findByPk(client.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Generate a JWT token that expires in 30 days
    const token = jwt.sign(
      { 
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        type: 'client_referral_link'
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    const baseUrl = tenant.clientUrl || process.env.CLIENT_URL || 'http://localhost:5173/tenant';
    const referralLink = `${baseUrl.replace(/\/$/, '')}/generate-referral?token=${token}`;

    res.json({
      link: referralLink,
      token: token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email
      }
    });
  } catch (error) {
    console.error('Error generating client referral link:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Validate token and return client info for pre-filling form
exports.validateClientToken = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

    // Verify it's a client referral link token
    if (decoded.type !== 'client_referral_link') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    // Verify client still exists
    const client = await User.findByPk(decoded.clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      name: client.name,
      email: client.email,
      clientId: client.id
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error validating client token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
