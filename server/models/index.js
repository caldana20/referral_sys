const sequelize = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const Referral = require('./Referral');
const Estimate = require('./Estimate');
const RewardSetting = require('./RewardSetting');

// Tenant relationships
Tenant.hasMany(User, { foreignKey: 'tenantId' });
User.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Referral, { foreignKey: 'tenantId' });
Referral.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Estimate, { foreignKey: 'tenantId' });
Estimate.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(RewardSetting, { foreignKey: 'tenantId' });
RewardSetting.belongsTo(Tenant, { foreignKey: 'tenantId' });

// Existing relationships
User.hasMany(Referral, { foreignKey: 'userId' });
Referral.belongsTo(User, { foreignKey: 'userId' });

Referral.hasMany(Estimate, { foreignKey: 'referralId' });
Estimate.belongsTo(Referral, { foreignKey: 'referralId' });

const db = {
  sequelize,
  Tenant,
  User,
  Referral,
  Estimate,
  RewardSetting
};

module.exports = db;
