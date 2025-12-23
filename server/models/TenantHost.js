const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tenant = require('./Tenant');

const TenantHost = sequelize.define('TenantHost', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

TenantHost.belongsTo(Tenant, { foreignKey: 'tenantId', allowNull: false });
Tenant.hasMany(TenantHost, { foreignKey: 'tenantId' });

module.exports = TenantHost;

