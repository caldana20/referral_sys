const { Referral, User, Estimate, Tenant } = require('../models');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { getFieldsForTenant } = require('../config/tenantFields');

exports.createReferral = async (req, res) => {
  // Client identifies themselves
  const { email, name, selectedReward, prospectName, prospectEmail, tenantSlug } = req.body;
  console.log('Creating referral request:', req.body);

  try {
    if (!tenantSlug) {
      return res.status(400).json({ message: 'tenantSlug is required' });
    }
    const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const companyName = tenant.name || 'Your Company';
    const fromEmail = tenant.sendgridFromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;

    // Check if client exists in this tenant
    const normalizedEmail = email ? email.toLowerCase() : '';
    let user = await User.findOne({ where: { email: normalizedEmail, tenantId: tenant.id } });
    if (!user) {
      console.log('Client not found for email:', normalizedEmail);
      return res.status(404).json({ message: 'Client not found. Please contact support.' });
    }

    console.log('Found user:', user.id);
    
    // Generate unique code per tenant
    let code;
    for (let i = 0; i < 5; i++) {
      const candidate = crypto.randomBytes(4).toString('hex');
      const existing = await Referral.findOne({ where: { code: candidate, tenantId: user.tenantId } });
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res.status(500).json({ message: 'Failed to generate referral code' });
    }

    const referralData = {
      userId: user.id,
      tenantId: tenant.id,
      code,
      selectedReward,
      status: 'Open'
    };

    if (prospectName) referralData.prospectName = prospectName;
    if (prospectEmail && prospectEmail.trim() !== '') referralData.prospectEmail = prospectEmail;

    const referral = await Referral.create(referralData);

    console.log('Referral created:', referral.id);

    // Send confirmation email to the client
    const baseUrl = tenant.clientUrl || process.env.CLIENT_URL || 'http://localhost:5173';
    const referralLink = `${baseUrl.replace(/\/$/, '')}/referral/${code}`;
    
    // --- Send Email to Client ---
    const clientEmailSubject = `Your ${companyName} Referral Link is Ready! ✨`;
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
        </div>
        
        <div style="text-align: center; background-color: #f0f9ff; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #1e3a8a; margin-top: 0; font-size: 24px;">Your Link is Ready!</h1>
          <p style="color: #4b5563; font-size: 16px;">Here is your unique referral link to share with your friend.</p>
          
          <div style="background-color: #ffffff; padding: 15px; border: 2px dashed #2563eb; border-radius: 6px; margin: 20px 0; word-break: break-all;">
            <a href="${referralLink}" style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 18px;">${referralLink}</a>
          </div>
          
          <p style="color: #4b5563; margin-bottom: 0;">Reward selected: <strong>${selectedReward}</strong></p>
        </div>

        <div style="color: #6b7280; font-size: 14px; line-height: 1.5;">
          <p><strong>What's next?</strong></p>
          <ol>
            <li>Share this link with your friend.</li>
            <li>When they request an estimate using your link, we'll track it.</li>
            <li>Once their service is completed, you earn your reward!</li>
          </ol>
          ${prospectName ? `<p>We've noted that this link is for <strong>${prospectName}</strong>.</p>` : ''}
        </div>
        
        <div style="margin-top: 30px; pt-20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send to Client
    sendEmail({
      to: user.email,
      subject: clientEmailSubject,
      html: clientEmailHtml,
      fromEmail,
      fromName: companyName
    }).catch(err => console.error('Failed to send referral confirmation email to client:', err));

    // --- Send Email to Admins ---
    try {
        const admins = await User.findAll({ where: { role: 'admin', tenantId: user.tenantId } });
        const adminEmails = admins.map(a => a.email);

        if (adminEmails.length > 0) {
            const adminEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #2563eb; text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">New Referral Link Created</h2>
                <p style="font-size: 16px; color: #374151;">A client has generated a new referral link.</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 8px;"><strong>Client Name:</strong> ${user.name}</li>
                        <li style="margin-bottom: 8px;"><strong>Client Email:</strong> ${user.email}</li>
                        <li style="margin-bottom: 8px;"><strong>Reward Selected:</strong> <span style="color: #059669; font-weight: bold;">${selectedReward}</span></li>
                        <li style="margin-bottom: 8px;"><strong>Target Prospect:</strong> ${prospectName || 'N/A'}</li>
                        <li><strong>Referral Code:</strong> <code style="background-color: #e0f2fe; color: #0284c7; padding: 2px 4px; border-radius: 4px;">${code}</code></li>
                    </ul>
                </div>
                
                <div style="margin-top: 20px; font-size: 14px; color: #6b7280; text-align: center;">
                    ${companyName} Admin Notification
                </div>
              </div>
            `;

            sendEmail({
                to: adminEmails,
                subject: `New ${companyName} Referral Link Generated`,
                html: adminEmailHtml,
                fromEmail,
                fromName: companyName
            }).catch(err => console.error('Failed to send admin notification for new referral:', err));
        }
    } catch (adminErr) {
        console.error('Error fetching admins for notification:', adminErr);
    }

    res.status(201).json(referral);

  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReferrals = async (req, res) => {
  try {
    const referrals = await Referral.findAll({
      where: { tenantId: req.user.tenantId },
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Estimate, attributes: ['id', 'createdAt', 'name', 'email', 'customFields'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Ensure Estimates are properly serialized
    const serializedReferrals = referrals.map(referral => {
      const ref = referral.toJSON();
      return ref;
    });
    
    res.json(serializedReferrals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateReferralStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const referral = await Referral.findOne({
      where: { id, tenantId: req.user.tenantId },
      include: [{ model: User }]
    });
    if (!referral) return res.status(404).json({ message: 'Referral not found' });

    const tenant = await Tenant.findByPk(req.user.tenantId);
    const companyName = tenant?.name || 'Your Company';
    const fromEmail = tenant?.sendgridFromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;

    const previousStatus = referral.status;
    referral.status = status;
    await referral.save();

    // Send email notification when referral is closed
    if (status === 'Closed' && previousStatus !== 'Closed' && referral.User) {
      try {
        const clientEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
            </div>
            
            <div style="text-align: center; background-color: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
              <h1 style="color: #166534; margin-top: 0; font-size: 24px;">Your Reward Has Been Activated! 🎉</h1>
              <p style="color: #374151; font-size: 16px;">
                Great news! Your referral reward has been closed and is now ready to use.
              </p>
            </div>

            <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              <p>Hi ${referral.User.name},</p>
              <p>We're excited to let you know that your referral reward has been successfully closed and activated!</p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <h3 style="color: #374151; margin-top: 0;">Referral Details:</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  <li style="margin-bottom: 10px;"><strong>Referral Code:</strong> <code style="background-color: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${referral.code}</code></li>
                  <li style="margin-bottom: 10px;"><strong>Reward:</strong> <span style="color: #059669; font-weight: bold;">${referral.selectedReward}</span></li>
                  ${referral.prospectName ? `<li style="margin-bottom: 10px;"><strong>Referred:</strong> ${referral.prospectName}</li>` : ''}
                </ul>
              </div>

              <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h3 style="color: #1e40af; margin-top: 0;">What This Means:</h3>
                <p style="margin: 0; color: #374151;">Your reward is now active and ready to use! Thank you for referring friends to ${companyName}. We truly appreciate your support.</p>
              </div>

              <p style="margin-top: 20px;">If you have any questions about your reward or need assistance, please don't hesitate to contact us.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>Thank you for being a valued ${companyName} client!</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: referral.User.email,
          subject: `Your ${companyName} Reward Has Been Activated! 🎉`,
          html: clientEmailHtml,
          fromEmail,
          fromName: companyName
        });

        console.log(`Reward closure email sent to ${referral.User.email} for referral ${referral.code}`);
      } catch (emailError) {
        console.error(`Failed to send reward closure email to ${referral.User.email}:`, emailError);
        // Don't fail the request if email fails
      }
    }

    res.json(referral);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReferralByCode = async (req, res) => {
  const { code } = req.params;
  try {
    const { tenantSlug } = req.query;
    if (!tenantSlug) {
      return res.status(400).json({ message: 'tenantSlug is required' });
    }

    const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const referral = await Referral.findOne({ 
      where: { code, tenantId: tenant.id },
      include: [{ model: Estimate }]
    });
    if (!referral) return res.status(404).json({ message: 'Invalid referral code' });
    
    const referralData = referral.toJSON();
    referralData.used = referral.Estimates && referral.Estimates.length > 0;
    referralData.fieldConfig = getFieldsForTenant(tenant.slug);

    res.json(referralData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.bulkDeleteReferrals = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No referral IDs provided' });
  }

  try {
    await Referral.destroy({ where: { id: ids } });
    res.json({ message: 'Referrals deleted successfully' });
  } catch (error) {
    console.error('Error deleting referrals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
