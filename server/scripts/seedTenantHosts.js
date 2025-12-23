require('dotenv').config();
const { Tenant, TenantHost, sequelize } = require('../models');

const DEFAULT_BASE = process.env.HOST_BASE || 'localhost';

async function main() {
  try {
    await sequelize.authenticate();
    const tenants = await Tenant.findAll();

    for (const tenant of tenants) {
      const host = `${tenant.slug}.${DEFAULT_BASE}`.toLowerCase();
      const existing = await TenantHost.findOne({ where: { host } });
      if (!existing) {
        await TenantHost.create({
          host,
          isPrimary: true,
          verified: true,
          tenantId: tenant.id
        });
        console.log(`Created host mapping ${host} -> tenant ${tenant.slug}`);
      } else {
        console.log(`Host mapping exists: ${host}`);
      }
    }
    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding tenant hosts failed:', err);
    process.exit(1);
  }
}

main();

