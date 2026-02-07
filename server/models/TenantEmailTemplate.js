const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantEmailTemplate = sequelize.define('TenantEmailTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  html: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['tenantId', 'key']
    }
  ]
});

module.exports = TenantEmailTemplate;
