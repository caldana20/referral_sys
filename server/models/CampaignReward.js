const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CampaignReward = sequelize.define('CampaignReward', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rewardSettingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = CampaignReward;

