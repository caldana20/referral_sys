const { User, Tenant, TenantHost } = require('../models');
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
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.tenantId !== req.user.tenantId) {
        return res.status(409).json({ message: 'Email already exists for another tenant' });
      }
      return res.status(409).json({ message: 'User with this email already exists' });
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
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
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

// Update a user (admin only, same tenant)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  try {
    const user = await User.findOne({ where: { id, tenantId: req.user.tenantId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email.trim() === '') return res.status(400).json({ message: 'Email cannot be empty' });
    if (name && name.trim() === '') return res.status(400).json({ message: 'Name cannot be empty' });

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone;

    await user.save();
    const resp = user.toJSON();
    delete resp.password_hash;
    res.json(resp);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user', error: error.message });
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
  const { clientIds, campaignId, groupId } = req.body;

  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing tenant context' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    let resolvedClientIds = Array.isArray(clientIds) ? clientIds : [];
    if ((!resolvedClientIds || resolvedClientIds.length === 0) && groupId) {
      const Group = require('../models').Group;
      const GroupMember = require('../models').GroupMember;
      const groupIdNum = Number(groupId);
      if (!Number.isFinite(groupIdNum)) return res.status(400).json({ message: 'Invalid groupId' });
      const group = await Group.findOne({ where: { id: groupIdNum, tenantId } });
      if (!group) return res.status(400).json({ message: 'Invalid groupId' });
      const members = await GroupMember.findAll({ where: { groupId: group.id } });
      resolvedClientIds = members.map((m) => m.userId);
    }

    if (!resolvedClientIds || resolvedClientIds.length === 0) {
      return res.status(400).json({ message: 'No client IDs provided' });
    }

    const clients = await User.findAll({
      where: {
        id: resolvedClientIds,
        role: 'client',
        tenantId
      }
    });

    if (clients.length === 0) {
      return res.status(404).json({ message: 'No valid clients found' });
    }

    const companyName = tenant.name || 'Your Company';
    // Validate campaign for tenant if provided
    let campaignName = null;
    if (campaignId) {
      const campaign = await require('../models').Campaign.findOne({ where: { id: campaignId, tenantId } });
      if (!campaign) return res.status(400).json({ message: 'Invalid campaignId' });
      campaignName = campaign.name || null;
    }
    const tenantSender = await require('./senderController').resolveTenantSender(tenantId);
    const fromEmail = tenantSender?.fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    const fromName = tenantSender?.fromName || companyName;
    if (!fromEmail) return res.status(500).json({ message: 'Sender not configured. Configure tenant sender or set SENDGRID_FROM_EMAIL.' });
    const host = (await getPrimaryHost(tenant.id)) || (process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'localhost:3000');
    const protocol = process.env.CLIENT_PROTOCOL || (host.startsWith('http') ? '' : 'http');
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

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
            campaignId: campaignId || null,
            type: 'client_referral_link'
          },
          process.env.JWT_SECRET || 'secret_key',
          { expiresIn: '30d' }
        );

        // Create personalized link that will pre-fill their information
        const personalizedLink = `${await buildTenantBaseUrl(tenant.id)}/generate-referral?token=${token}`;

        const { resolveEmailTemplate } = require('../utils/emailTemplates');
        const template = await resolveEmailTemplate(tenant.id, 'client_invite', {
          companyName,
          clientName: client.name,
          campaignName,
          personalizedLink
        });

        await sendEmail({
          to: client.email,
          subject: template.subject,
          html: template.html,
          tenantId,
          fromEmail,
          fromName
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
async function getPrimaryHost(tenantId) {
  const host = await TenantHost.findOne({
    where: { tenantId },
    order: [['isPrimary', 'DESC']]
  });
  return host ? host.host : null;
}

function replaceWildcardHost(raw, tenantSlug) {
  if (!raw) return raw;
  let clean = raw;
  try {
    clean = decodeURIComponent(clean);
  } catch (_) {
    // ignore decode errors, use original
  }
  clean = clean.replace(/%2A/gi, '*');
  // Replace any wildcard sequences with the tenant slug
  clean = clean
    .replace(/^\*+\./, `${tenantSlug}.`)
    .replace(/\.\*+\./g, `.${tenantSlug}.`)
    .replace(/\.\*+$/g, `.${tenantSlug}`)
    .replace(/\*+/g, tenantSlug)
    .replace(/^\.\./, '.')
    .replace(/\/+$/, '');
  // If slug is already present twice (e.g., default.default.host), collapse duplicates at start
  clean = clean.replace(new RegExp(`^(${tenantSlug}\\.)+`), `${tenantSlug}.`);
  return clean;
}

async function buildTenantBaseUrl(tenantId) {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant || !tenant.slug) {
    throw new Error('Tenant slug not found for referral URL generation');
  }
  const tenantSlug = tenant.slug;

  const primaryHost = await getPrimaryHost(tenantId);
  if (primaryHost) {
    const protocol = process.env.CLIENT_PROTOCOL || (primaryHost.startsWith('http') ? '' : 'https');
    let clean = replaceWildcardHost(primaryHost, tenantSlug)
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    if (clean.includes('localhost') && !clean.includes(':')) {
      clean = `${clean}:${process.env.CLIENT_PORT || '3000'}`;
    }
    return `${protocol ? `${protocol}://` : ''}${clean}`;
  }

  let base = process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'localhost:3000';
  const protocol = process.env.CLIENT_PROTOCOL || (base.startsWith('http') ? '' : 'https');
  let clean = replaceWildcardHost(base, tenantSlug)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  if (clean.includes('localhost') && !clean.includes(':')) {
    clean = `${clean}:${process.env.CLIENT_PORT || '3000'}`;
  }

  return `${protocol ? `${protocol}://` : ''}${clean}`;
}

exports.generateClientReferralLink = async (req, res) => {
  const { clientId } = req.params;
  const { campaignId } = req.query;

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

    // Validate campaign if provided
    let campaign = null;
    if (campaignId) {
      campaign = await require('../models').Campaign.findOne({ where: { id: campaignId, tenantId: tenant.id } });
      if (!campaign) return res.status(400).json({ message: 'Invalid campaignId' });
    }

    // Generate a JWT token that expires in 30 days
    const token = jwt.sign(
      { 
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        campaignId: campaign ? campaign.id : null,
        type: 'client_referral_link'
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    const baseUrl = await buildTenantBaseUrl(tenant.id);
    const referralLink = `${baseUrl}/generate-referral?token=${token}`;

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

    let allowedRewards = null;
    if (decoded.campaignId) {
      const campaign = await require('../models').Campaign.findOne({
        where: { id: decoded.campaignId, tenantId: decoded.tenantId },
        include: [
          {
            model: require('../models').CampaignReward,
            include: [{ model: require('../models').RewardSetting, attributes: ['id', 'name'] }]
          }
        ]
      });
      if (campaign) {
        allowedRewards = (campaign.CampaignRewards || []).map((cr) => ({
          id: cr.rewardSettingId,
          name: cr.RewardSetting?.name || ''
        }));
      }
    }

    res.json({
      name: client.name,
      email: client.email,
      clientId: client.id,
      campaignId: decoded.campaignId || null,
      allowedRewards
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
