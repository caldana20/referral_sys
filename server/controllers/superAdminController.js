const { Tenant, User } = require('../models');

exports.listTenants = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const { rows: tenants, count } = await Tenant.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    const adminCounts = await User.findAll({
      attributes: ['tenantId', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      where: { role: 'admin' },
      group: ['tenantId'],
      raw: true
    });
    const countMap = new Map(adminCounts.map((row) => [row.tenantId, Number(row.count)]));

    const items = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      clientUrl: tenant.clientUrl,
      subscriptionStatus: tenant.subscriptionStatus,
      isActive: tenant.isActive,
      deactivatedAt: tenant.deactivatedAt,
      deletedAt: tenant.deletedAt,
      createdAt: tenant.createdAt,
      adminCount: countMap.get(tenant.id) || 0
    }));

    res.json({
      tenants: items,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('listTenants error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTenantStatus = async (req, res) => {
  const tenantId = Number(req.params.id);
  const { isActive } = req.body || {};
  if (!Number.isFinite(tenantId)) {
    return res.status(400).json({ message: 'Invalid tenant id' });
  }

  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    tenant.isActive = Boolean(isActive);
    tenant.deactivatedAt = tenant.isActive ? null : new Date();
    await tenant.save();

    res.json({
      id: tenant.id,
      isActive: tenant.isActive,
      deactivatedAt: tenant.deactivatedAt
    });
  } catch (error) {
    console.error('updateTenantStatus error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.softDeleteTenant = async (req, res) => {
  const tenantId = Number(req.params.id);
  if (!Number.isFinite(tenantId)) {
    return res.status(400).json({ message: 'Invalid tenant id' });
  }

  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    tenant.isActive = false;
    tenant.deactivatedAt = tenant.deactivatedAt || new Date();
    tenant.deletedAt = new Date();
    await tenant.save();

    res.json({ id: tenant.id, deletedAt: tenant.deletedAt });
  } catch (error) {
    console.error('softDeleteTenant error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTenant = async (req, res) => {
  const tenantId = Number(req.params.id);
  if (!Number.isFinite(tenantId)) {
    return res.status(400).json({ message: 'Invalid tenant id' });
  }

  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        zip: tenant.zip,
        country: tenant.country,
        slug: tenant.slug,
        clientUrl: tenant.clientUrl,
        sendgridFromEmail: tenant.sendgridFromEmail,
        logoUrl: tenant.logoUrl,
        logoMediaId: tenant.logoMediaId,
        estimateFieldConfig: tenant.estimateFieldConfig,
        stripeCustomerId: tenant.stripeCustomerId,
        stripeSubscriptionId: tenant.stripeSubscriptionId,
        stripePriceId: tenant.stripePriceId,
        subscriptionStatus: tenant.subscriptionStatus,
        subscriptionCurrentPeriodEnd: tenant.subscriptionCurrentPeriodEnd,
        isActive: tenant.isActive,
        deactivatedAt: tenant.deactivatedAt,
        deletedAt: tenant.deletedAt,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      }
    });
  } catch (error) {
    console.error('getTenant error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
