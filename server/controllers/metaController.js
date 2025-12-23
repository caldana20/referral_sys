const geo = require('../config/geo.json');
const { Tenant } = require('../models');

exports.listCountries = (_req, res) => {
  res.json(geo.countries || []);
};

exports.listStates = (req, res) => {
  const { countryCode } = req.params;
  if (!countryCode) return res.status(400).json({ message: 'countryCode is required' });
  const states = geo.states?.[countryCode.toUpperCase()] || [];
  res.json(states);
};

// Resolve tenant from host resolver middleware
exports.getTenantFromHost = async (req, res) => {
  try {
    if (!req.tenant || !req.tenant.tenantId) {
      return res.status(404).json({ message: 'Tenant not resolved' });
    }
    const tenant = await Tenant.findByPk(req.tenant.tenantId, {
      attributes: ['id', 'slug', 'name', 'clientUrl', 'logoUrl', 'sendgridFromEmail']
    });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    res.json({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      clientUrl: tenant.clientUrl,
      logoUrl: tenant.logoUrl,
      sendgridFromEmail: tenant.sendgridFromEmail
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve tenant', error: err.message });
  }
};

