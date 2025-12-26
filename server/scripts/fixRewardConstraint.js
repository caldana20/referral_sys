/**
 * Fix RewardSettings unique constraint to be per-tenant (tenantId + name).
 *
 * Usage:
 *   node scripts/fixRewardConstraint.js
 *
 * Ensure your DB env vars are set (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD, DB_PORT).
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function run() {
  // Drop any existing constraints, then add the composite one
  const dropLegacy = `ALTER TABLE "RewardSettings" DROP CONSTRAINT IF EXISTS "RewardSettings_name_key";`;
  const dropComposite = `ALTER TABLE "RewardSettings" DROP CONSTRAINT IF EXISTS reward_tenant_name;`;
  const dropIndex = `DROP INDEX IF EXISTS reward_tenant_name;`; // if an index with this name exists
  const addCompositeIfMissing = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reward_tenant_name'
      ) THEN
        EXECUTE 'ALTER TABLE "RewardSettings" ADD CONSTRAINT reward_tenant_name UNIQUE ("tenantId", "name")';
      END IF;
    END;
    $$;
  `;

  try {
    console.log('Dropping legacy global constraint if present...');
    await sequelize.query(dropLegacy);
    console.log('Dropping existing composite constraint if present...');
    await sequelize.query(dropComposite);
    console.log('Dropping stray index named reward_tenant_name if present...');
    await sequelize.query(dropIndex);
    console.log('Adding composite unique constraint (tenantId, name) if missing...');
    await sequelize.query(addCompositeIfMissing);
    console.log('Done.');
  } catch (err) {
    console.error('Failed to fix RewardSettings constraint:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

