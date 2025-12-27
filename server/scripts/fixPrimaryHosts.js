/**
 * Normalize primary TenantHost per tenant:
 * - If a host ending with ".tenant.refoza.com" exists for the tenant, mark it primary
 *   and clear isPrimary on the others.
 * - Otherwise, do nothing and report the tenant as needing manual attention.
 *
 * Safe by default: runs in dry-run mode unless RUN=1 is set.
 *
 * Usage:
 *   node scripts/fixPrimaryHosts.js          # dry run (reports intended changes)
 *   RUN=1 node scripts/fixPrimaryHosts.js    # apply changes
 */

require('dotenv').config();
const { Tenant, TenantHost, sequelize } = require('../models');

const APPLY = process.env.RUN === '1' || process.env.RUN === 'true';

async function run() {
  try {
    const tenants = await Tenant.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['id', 'ASC']]
    });

    let fixed = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const hosts = await TenantHost.findAll({
        where: { tenantId: tenant.id },
        order: [['id', 'ASC']]
      });

      const preferred = hosts.find(
        (h) =>
          h.host &&
          h.host.toLowerCase().endsWith('.tenant.refoza.com') &&
          h.host.toLowerCase().includes(tenant.slug.toLowerCase())
      );

      if (!preferred) {
        skipped += 1;
        console.log(
          `[skip] ${tenant.slug}: no matching *.tenant.refoza.com host found`
        );
        continue;
      }

      if (preferred.isPrimary && hosts.every((h) => h.id === preferred.id || !h.isPrimary)) {
        console.log(`[ok]   ${tenant.slug}: primary already ${preferred.host}`);
        continue;
      }

      console.log(
        `[${APPLY ? 'fix' : 'plan'}] ${tenant.slug}: set primary to ${preferred.host}`
      );

      if (APPLY) {
        // Clear all primaries for this tenant
        await TenantHost.update(
          { isPrimary: false },
          { where: { tenantId: tenant.id } }
        );
        // Set preferred as primary
        preferred.isPrimary = true;
        await preferred.save();
        fixed += 1;
      }
    }

    console.log('\nSummary:');
    console.log(`Tenants processed: ${tenants.length}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped (no matching host): ${skipped}`);

    if (!APPLY) {
      console.log('\nDry run complete. Set RUN=1 to apply changes.');
    }
  } catch (err) {
    console.error('Failed to fix primary hosts:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

