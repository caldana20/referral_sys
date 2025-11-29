const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RewardSetting = sequelize.define('RewardSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = RewardSetting;

