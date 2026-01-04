const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantSender = sequelize.define('TenantSender', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  fromName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fromEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true }
  },
  sendgridSenderId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending' // pending | verified | error
  },
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = TenantSender;


