const { Tenant, User, RewardSetting, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Utility: make slug from name + short id
function slugify(name) {
  const base = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return [base || 'tenant', suffix].join('-');
}

function buildClientUrl(base, slug) {
  const clean = (base || '').replace(/\/$/, '');
  return `${clean}/${slug}`;
}

// Preview derived values
exports.preview = async (req, res) => {
  const { companyName } = req.body;
  const trimmedName = (companyName || '').trim();
  if (!trimmedName) return res.status(400).json({ message: 'companyName is required' });

  const slug = slugify(trimmedName);
  const clientUrlBase = process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'http://localhost:3000/tenant';
  const clientUrl = buildClientUrl(clientUrlBase, slug);

  res.json({ slug, clientUrl });
};

// Confirm and create tenant + first admin (transactional)
exports.confirm = async (req, res) => {
  const {
    trimmedName,
    phone,
    email,
    address,
    city,
    state,
    zip,
    country,
    adminEmail,
    adminPassword,
    sendgridFromEmail,
    tenantSlug
  } = req.body;

  if (!trimmedName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'companyName, adminEmail, adminPassword are required' });
  }

  const slug = tenantSlug || slugify(trimmedName);
  const clientUrlBase = process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'http://localhost:3000/tenant';
  const clientUrl = buildClientUrl(clientUrlBase, slug);

  const tx = await sequelize.transaction();
  try {
    // Ensure unique slug
    const existing = await Tenant.findOne({ where: { slug } });
    if (existing) {
      await tx.rollback();
      return res.status(400).json({ message: 'Tenant slug already exists' });
    }

    const tenant = await Tenant.create({
      name: trimmedName,
      phone,
      email,
      address,
      city,
      state,
      zip,
      country,
      slug,
      clientUrl,
      sendgridFromEmail
    }, { transaction: tx });

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminUser = await User.create({
      name: 'Tenant Admin',
      email: adminEmail.toLowerCase(),
      password_hash: passwordHash,
      role: 'admin',
      tenantId: tenant.id
    }, { transaction: tx });

    // Optionally seed default reward settings per tenant (empty for now)

    await tx.commit();
    res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        clientUrl: tenant.clientUrl,
        sendgridFromEmail: tenant.sendgridFromEmail
      },
      admin: {
        id: adminUser.id,
        email: adminUser.email
      }
    });
  } catch (err) {
    await tx.rollback();
    res.status(500).json({ message: 'Failed to create tenant', error: err.message });
  }
};

// Public list for login dropdowns (minimal fields)
exports.listPublic = async (_req, res) => {
  try {
    // For compatibility if logoUrl column not yet migrated, avoid selecting it explicitly here.
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name', 'slug']
    });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list tenants', error: err.message });
  }
};

// Authenticated: get current tenant settings
exports.getSettings = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      sendgridFromEmail: tenant.sendgridFromEmail
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load settings', error: err.message });
  }
};

// Authenticated: update tenant settings (name, logo)
exports.updateSettings = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const { name } = req.body;
    if (name && name.trim() === '') {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }

    if (name) {
      tenant.name = name.trim();
    }

    if (req.file) {
      const filePath = req.file.path.replace(/\\/g, '/');
      const publicUrl = `${req.protocol}://${req.get('host')}/${filePath}`;
      tenant.logoUrl = publicUrl;
    }

    await tenant.save();

    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      sendgridFromEmail: tenant.sendgridFromEmail
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
};

// Authenticated: get tenant estimate field config
exports.getFieldConfig = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    res.json({
      fields: tenant.estimateFieldConfig || null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load field config', error: err.message });
  }
};

// Authenticated: update tenant estimate field config
exports.updateFieldConfig = async (req, res) => {
  const { fields } = req.body;

  if (!Array.isArray(fields)) {
    return res.status(400).json({ message: 'fields must be an array' });
  }

  for (const field of fields) {
    if (!field.id || !field.label || !field.type) {
      return res.status(400).json({ message: 'Each field requires id, label, and type' });
    }
    if (field.type === 'select' && (!Array.isArray(field.options) || field.options.length === 0)) {
      return res.status(400).json({ message: 'Select fields require non-empty options' });
    }
  }

  try {
    const tenant = await Tenant.findByPk(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    tenant.estimateFieldConfig = fields;
    await tenant.save();

    res.json({ fields: tenant.estimateFieldConfig });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update field config', error: err.message });
  }
};



