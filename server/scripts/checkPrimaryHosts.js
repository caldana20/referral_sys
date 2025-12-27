/**
 * List primary TenantHost records and flag tenants without exactly one primary.
 *
 * Usage:
 *   node scripts/checkPrimaryHosts.js
 */

require('dotenv').config();
const { Tenant, TenantHost, sequelize } = require('../models');

async function run() {
  try {
    const tenants = await Tenant.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['id', 'ASC']]
    });

    let missing = 0;
    let multi = 0;

    console.log('Primary hosts by tenant:');

    for (const tenant of tenants) {
      const primaries = await TenantHost.findAll({
        where: { tenantId: tenant.id, isPrimary: true },
        order: [['id', 'ASC']]
      });

      if (primaries.length === 1) {
        console.log(
          `- ${tenant.slug} (${tenant.name}): ${primaries[0].host}`
        );
      } else if (primaries.length === 0) {
        missing += 1;
        console.log(`- ${tenant.slug} (${tenant.name}): MISSING PRIMARY`);
      } else {
        multi += 1;
        const hosts = primaries.map((p) => p.host).join(', ');
        console.log(
          `- ${tenant.slug} (${tenant.name}): MULTIPLE PRIMARY HOSTS -> ${hosts}`
        );
      }
    }

    console.log('\nSummary:');
    console.log(`Tenants checked: ${tenants.length}`);
    console.log(`Missing primary: ${missing}`);
    console.log(`Multiple primary: ${multi}`);

    if (missing > 0 || multi > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Failed to check primary hosts:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

