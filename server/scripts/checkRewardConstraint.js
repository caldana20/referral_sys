/**
 * Verify RewardSettings has the composite unique constraint (tenantId, name)
 * and report any legacy global constraint.
 *
 * Usage:
 *   node scripts/checkRewardConstraint.js
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function run() {
  const checkSql = `
    SELECT conname,
           pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'RewardSettings';
  `;

  try {
    const [rows] = await sequelize.query(checkSql);
    const constraints = rows.map((r) => ({
      name: r.conname,
      definition: r.definition,
    }));

    const hasComposite = constraints.some(
      (c) =>
        c.name === 'reward_tenant_name' &&
        c.definition.includes('UNIQUE') &&
        c.definition.includes('tenantId') &&
        c.definition.includes('name')
    );

    const hasLegacy = constraints.some(
      (c) => c.name === 'RewardSettings_name_key' || c.definition.includes('UNIQUE (name)')
    );

    console.log('Constraints on RewardSettings:');
    constraints.forEach((c) => {
      console.log(`- ${c.name}: ${c.definition}`);
    });

    console.log('\nSummary:');
    console.log(`Composite (tenantId, name) exists: ${hasComposite ? 'YES' : 'NO'}`);
    console.log(`Legacy global unique on name exists: ${hasLegacy ? 'YES' : 'NO'}`);

    if (!hasComposite) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Failed to check constraints:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

