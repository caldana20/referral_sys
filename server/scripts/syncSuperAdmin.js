require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Tenant, sequelize } = require('../models');

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = (process.env.SUPER_ADMIN_PASSWORD || '').trim();

  if (!email || !password) {
    console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  try {
    const tenant = await Tenant.findOne({ order: [['id', 'ASC']] });
    const hash = await bcrypt.hash(password, 10);
    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: 'Super Admin',
        email,
        role: 'super_admin',
        password_hash: hash,
        tenantId: tenant?.id
      }
    });

    if (!created) {
      user.role = 'super_admin';
      user.password_hash = hash;
      if (!user.tenantId && tenant) user.tenantId = tenant.id;
      await user.save();
    }

    console.log(`Super admin synced: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Super admin sync failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
