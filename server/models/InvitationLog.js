const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvitationLog = sequelize.define('InvitationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  targetType: {
    type: DataTypes.ENUM('client', 'group'),
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    { fields: ['tenantId', 'targetType'] },
    { fields: ['tenantId', 'userId', 'sentAt'] },
    { fields: ['tenantId', 'groupId', 'sentAt'] }
  ]
});

module.exports = InvitationLog;
