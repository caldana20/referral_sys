require('dotenv').config();
const { sequelize } = require('../models');

async function main() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected. Running sync({ alter: true }) ...');
    await sequelize.sync({ alter: true });
    console.log('Schema sync completed.');
    process.exit(0);
  } catch (err) {
    console.error('Schema sync failed:', err);
    process.exit(1);
  }
}

main();


