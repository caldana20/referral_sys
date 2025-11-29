const sequelize = require('../config/database');
const User = require('./User');
const Referral = require('./Referral');
const Estimate = require('./Estimate');
const RewardSetting = require('./RewardSetting');

User.hasMany(Referral, { foreignKey: 'userId' });
Referral.belongsTo(User, { foreignKey: 'userId' });

Referral.hasMany(Estimate, { foreignKey: 'referralId' });
Estimate.belongsTo(Referral, { foreignKey: 'referralId' });

const db = {
  sequelize,
  User,
  Referral,
  Estimate,
  RewardSetting
};

module.exports = db;
