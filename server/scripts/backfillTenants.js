require('dotenv').config();
const { sequelize, Tenant, User, Referral, Estimate, RewardSetting } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Backfill script to:
 * - Create a default tenant if none exists.
 * - Assign all existing Users, Referrals, Estimates, RewardSettings to the default tenant.
 *
 * Note: Columns tenantId must already exist on these tables.
 * Run this once after deploying tenant-aware models.
 */

async function ensureDefaultTenant() {
  let tenant = await Tenant.findOne({ where: { slug: 'default' } });
  if (!tenant) {
    const baseUrl = process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'http://localhost:3000/tenant';
    const clientUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/default` : `https://example.com/tenant/default`;
    tenant = await Tenant.create({
      name: 'Default Tenant',
      phone: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      country: null,
      slug: 'default',
      clientUrl,
      sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || null
    });
    console.log(`Created default tenant with id=${tenant.id}`);
  } else {
    console.log(`Default tenant exists with id=${tenant.id}`);
  }
  return tenant;
}

async function backfillModels(defaultTenantId) {
  const models = [
    { model: User, name: 'User' },
    { model: Referral, name: 'Referral' },
    { model: Estimate, name: 'Estimate' },
    { model: RewardSetting, name: 'RewardSetting' }
  ];

  for (const { model, name } of models) {
    const [updated] = await model.update(
      { tenantId: defaultTenantId },
      { where: { tenantId: null } }
    );
    console.log(`Updated ${name}: set tenantId=${defaultTenantId} for ${updated} rows (tenantId was null).`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connection OK');

    // Ensure tables exist
    await sequelize.sync({ alter: true });

    const defaultTenant = await ensureDefaultTenant();
    await backfillModels(defaultTenant.id);

    console.log('Backfill completed.');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

main();


