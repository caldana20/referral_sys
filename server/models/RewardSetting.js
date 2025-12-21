const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RewardSetting = sequelize.define('RewardSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tenants',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['tenantId', 'name'],
      name: 'reward_tenant_name'
    }
  ]
});

module.exports = RewardSetting;


