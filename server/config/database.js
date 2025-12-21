require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_HOST,
  DB_PORT = 5432,
  DB_NAME,
  DB_USER,
  DB_PASS,
  DB_SSL
} = process.env;

// Enforce Postgres only. Fail fast if config is missing.
if (!DB_HOST || !DB_NAME || !DB_USER) {
  throw new Error('Postgres configuration missing: DB_HOST, DB_NAME, DB_USER are required.');
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  dialectOptions: DB_SSL === 'true'
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {}
});

module.exports = sequelize;

