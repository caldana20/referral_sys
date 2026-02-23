const { Referral, User, Estimate, Tenant, TenantHost, Media } = require('../models');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { getFieldsForTenant } = require('../config/tenantFields');
const { getSignedReadUrl } = require('../utils/storage');

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
  clean = clean
    .replace(/^\*+\./, `${tenantSlug}.`)
    .replace(/\.\*+\./g, `.${tenantSlug}.`)
    .replace(/\.\*+$/g, `.${tenantSlug}`)
    .replace(/\*+/g, tenantSlug)
    .replace(/^\.\./, '.')
    .replace(/\/+$/, '');
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

exports.buildTenantBaseUrl = buildTenantBaseUrl;

async function cloneReferralForReuse(referral) {
  const code = crypto.randomBytes(4).toString('hex');
  const newRef = await Referral.create({
    tenantId: referral.tenantId,
    userId: referral.userId,
    code,
    prospectEmail: referral.prospectEmail,
    prospectName: referral.prospectName,
    selectedReward: referral.selectedReward,
    status: 'Open'
  });
  return newRef;
}

exports.createReferral = async (req, res) => {
  // Client identifies themselves
  const { email, name, selectedReward, prospectName, prospectEmail, tenantSlug, campaignId } = req.body;
  console.log('Creating referral request:', req.body);

  try {
    const resolvedSlug = tenantSlug || req.tenant?.tenantSlug;
    const tenant = resolvedSlug
      ? await Tenant.findOne({ where: { slug: resolvedSlug } })
      : req.tenant?.tenantId
        ? await Tenant.findByPk(req.tenant.tenantId)
        : null;
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const bypassBilling =
      (process.env.FREE_TENANT_SLUG && process.env.FREE_TENANT_SLUG === tenant.slug) ||
      (process.env.FREE_TENANT_NAME && process.env.FREE_TENANT_NAME === tenant.name);

    // Enforce free tier limit: if not active subscription, allow up to 5 referrals
    const isActive = tenant.subscriptionStatus === 'active';
    if (!isActive && !bypassBilling) {
      const referralCount = await Referral.count({ where: { tenantId: tenant.id } });
      if (referralCount >= 5) {
        return res.status(403).json({
          message: 'Free limit reached. Subscribe to create more referrals.',
          code: 'REFERRAL_LIMIT_REACHED'
        });
      }
    }

    const companyName = tenant.name || 'Your Company';
    // Resolve tenant sender first; fallback to global
    const tenantSender = await require('./senderController').resolveTenantSender(tenant.id);
    const fromEmail = tenantSender?.fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    const fromName = tenantSender?.fromName || companyName;
    if (!fromEmail) {
      return res.status(500).json({ message: 'Sender not configured. Configure tenant sender or set SENDGRID_FROM_EMAIL.' });
    }

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

    // Validate campaign belongs to tenant, if provided
    let campaign = null;
    if (campaignId) {
      campaign = await require('../models').Campaign.findOne({ where: { id: campaignId, tenantId: tenant.id } });
      if (!campaign) return res.status(400).json({ message: 'Invalid campaignId' });
    }

    const referralData = {
      userId: user.id,
      tenantId: tenant.id,
      code,
      selectedReward,
      status: 'Open',
      campaignId: campaign ? campaign.id : null
    };

    if (prospectName) referralData.prospectName = prospectName;
    if (prospectEmail && prospectEmail.trim() !== '') referralData.prospectEmail = prospectEmail;

    const referral = await Referral.create(referralData);

    console.log('Referral created:', referral.id);

    // Send confirmation email to the client
    // Prefer primary host mapping, fall back to configured URLs
    const baseUrl = await buildTenantBaseUrl(tenant.id);
    const referralLink = `${baseUrl}/referral/${code}`;
    
    // --- Send Email to Client ---
    const { resolveEmailTemplate } = require('../utils/emailTemplates');
    const clientTemplate = await resolveEmailTemplate(tenant.id, 'referral_link_client', {
      companyName,
      clientName: user.name,
      referralLink,
      selectedReward,
      prospectName
    });

    // Send to Client
    console.log('Email send (referral->client)', { tenant: tenant.slug, fromEmail, fromName, to: user.email });
    sendEmail({
      to: user.email,
      subject: clientTemplate.subject,
      html: clientTemplate.html,
      tenantId: tenant.id,
      fromEmail,
      fromName
    }).catch(err => console.error('Failed to send referral confirmation email to client:', err));

    // --- Send Email to Admins ---
    try {
        const admins = await User.findAll({ where: { role: 'admin', tenantId: user.tenantId } });
        const adminEmails = admins.map(a => a.email);

        if (adminEmails.length > 0) {
            const adminTemplate = await resolveEmailTemplate(tenant.id, 'referral_link_admin', {
              companyName,
              clientName: user.name,
              clientEmail: user.email,
              selectedReward,
              prospectName: prospectName || 'N/A',
              code
            });

            console.log('Email send (referral->admins)', { tenant: tenant.slug, fromEmail, fromName, to: adminEmails });
            sendEmail({
                to: adminEmails,
                subject: adminTemplate.subject,
                html: adminTemplate.html,
                tenantId: tenant.id,
                fromEmail,
                fromName
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
        { model: Estimate, attributes: ['id', 'createdAt', 'name', 'email', 'customFields'], required: false },
        { model: require('../models').Campaign, attributes: ['id', 'name'] }
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
    const tenantSender = await require('./senderController').resolveTenantSender(req.user.tenantId);
    const fromEmail = tenantSender?.fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    const fromName = tenantSender?.fromName || companyName;
    if (!fromEmail) return res.status(500).json({ message: 'Sender not configured. Configure tenant sender or set SENDGRID_FROM_EMAIL.' });

    const previousStatus = referral.status;
    referral.status = status;
    await referral.save();

    // Send email notification when referral is closed
    if (status === 'Closed' && previousStatus !== 'Closed' && referral.User) {
      try {
        const { resolveEmailTemplate } = require('../utils/emailTemplates');
        const rewardTemplate = await resolveEmailTemplate(tenant.id, 'referral_reward_closed', {
          companyName,
          clientName: referral.User.name,
          referralCode: referral.code,
          selectedReward: referral.selectedReward,
          prospectName: referral.prospectName
        });

        await sendEmail({
          to: referral.User.email,
          subject: rewardTemplate.subject,
          html: rewardTemplate.html,
          tenantId: tenant.id,
          fromEmail,
          fromName
        });

        console.log(`Reward closure email sent to ${referral.User.email} for referral ${referral.code}`, { fromEmail, fromName });
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
  const referral = await Referral.findOne({
    where: { code },
    include: [{ model: Estimate }, { model: Tenant, required: true }, { model: require('../models').Campaign, attributes: ['id', 'name'] }]
  });

  if (!referral) return res.status(404).json({ message: 'Invalid referral code' });

  // If tenantSlug was provided, ensure it matches the referral's tenant
  const { tenantSlug } = req.query;
  if (tenantSlug && referral.Tenant && referral.Tenant.slug !== tenantSlug) {
    return res.status(404).json({ message: 'Invalid referral code' });
  }

  const tenant = referral.Tenant;
  
  const referralData = referral.toJSON();
  const used = referral.Estimates && referral.Estimates.length > 0;

  if (used) {
    // Try to reuse an existing open referral for the same client with no estimates
    let replacement = await Referral.findOne({
      where: {
        tenantId: referral.tenantId,
        userId: referral.userId,
        status: 'Open'
      },
      include: [{ model: Estimate }]
    });

    if (replacement && replacement.Estimates && replacement.Estimates.length > 0) {
      replacement = null;
    }

    if (!replacement) {
      replacement = await cloneReferralForReuse(referral);
    }

    referralData.used = true;
    referralData.newCode = replacement.code;
  } else {
    referralData.used = false;
  }

  referralData.tenant = {
    name: tenant.name,
    logoUrl: tenant.logoUrl || null
  };
  if (tenant.estimateHeaderMediaId) {
    const headerMedia = await Media.findOne({
      where: { id: tenant.estimateHeaderMediaId, tenantId: tenant.id }
    });
    referralData.tenant.estimateHeaderImageUrl = headerMedia
      ? (await getSignedReadUrl(headerMedia.key)) || headerMedia.url
      : null;
  } else {
    referralData.tenant.estimateHeaderImageUrl = null;
  }
  if (referral.Campaign) {
    referralData.campaign = { id: referral.Campaign.id, name: referral.Campaign.name };
  }
  referralData.fieldConfig = tenant.estimateFieldConfig || getFieldsForTenant(tenant.slug);

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
