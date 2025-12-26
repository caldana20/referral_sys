/**
 * Quick helper to print estimateFieldConfig for a given tenant slug.
 * Usage:
 *   SLUG=holiday-family-7gxo node scripts/checkEstimateFieldConfig.js
 */

require('dotenv').config();
const { Tenant } = require('../models');

async function run() {
  const slug = process.env.SLUG || 'holiday-family-7gxo';
  try {
    const tenant = await Tenant.findOne({ where: { slug } });
    if (!tenant) {
      console.error(`Tenant not found for slug: ${slug}`);
      process.exit(1);
    }
    console.log(`Tenant: ${tenant.slug}`);
    console.log('estimateFieldConfig:', JSON.stringify(tenant.estimateFieldConfig, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error reading estimateFieldConfig:', err);
    process.exit(1);
  }
}

run();

