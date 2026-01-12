const sequelize = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const Referral = require('./Referral');
const Estimate = require('./Estimate');
const RewardSetting = require('./RewardSetting');
const TenantHost = require('./TenantHost');
const TenantSender = require('./TenantSender');
const Product = require('./Product');
const Campaign = require('./Campaign');
const CampaignReward = require('./CampaignReward');
const Media = require('./Media');

// Tenant relationships
Tenant.hasMany(User, { foreignKey: 'tenantId' });
User.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Referral, { foreignKey: 'tenantId' });
Referral.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Estimate, { foreignKey: 'tenantId' });
Estimate.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(RewardSetting, { foreignKey: 'tenantId' });
RewardSetting.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(TenantHost, { foreignKey: 'tenantId' });
TenantHost.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasOne(TenantSender, { foreignKey: 'tenantId' });
TenantSender.belongsTo(Tenant, { foreignKey: 'tenantId' });

// Media
Tenant.hasMany(Media, { foreignKey: 'tenantId' });
Media.belongsTo(Tenant, { foreignKey: 'tenantId' });

// Products
Tenant.hasMany(Product, { foreignKey: 'tenantId' });
Product.belongsTo(Tenant, { foreignKey: 'tenantId' });
Media.hasMany(Product, { foreignKey: 'imageMediaId' });
Product.belongsTo(Media, { foreignKey: 'imageMediaId', as: 'imageMedia' });

// Campaigns
Tenant.hasMany(Campaign, { foreignKey: 'tenantId' });
Campaign.belongsTo(Tenant, { foreignKey: 'tenantId' });

Product.hasMany(Campaign, { foreignKey: 'productId' });
Campaign.belongsTo(Product, { foreignKey: 'productId' });

// Existing relationships
User.hasMany(Referral, { foreignKey: 'userId' });
Referral.belongsTo(User, { foreignKey: 'userId' });

Referral.hasMany(Estimate, { foreignKey: 'referralId' });
Estimate.belongsTo(Referral, { foreignKey: 'referralId' });

// Campaign associations
Campaign.hasMany(Referral, { foreignKey: 'campaignId' });
Referral.belongsTo(Campaign, { foreignKey: 'campaignId' });

Campaign.hasMany(Estimate, { foreignKey: 'campaignId' });
Estimate.belongsTo(Campaign, { foreignKey: 'campaignId' });

// Campaign rewards (subset of tenant rewards)
Campaign.belongsToMany(RewardSetting, { through: CampaignReward, foreignKey: 'campaignId', otherKey: 'rewardSettingId' });
RewardSetting.belongsToMany(Campaign, { through: CampaignReward, foreignKey: 'rewardSettingId', otherKey: 'campaignId' });
CampaignReward.belongsTo(Campaign, { foreignKey: 'campaignId' });
CampaignReward.belongsTo(RewardSetting, { foreignKey: 'rewardSettingId' });
Campaign.hasMany(CampaignReward, { foreignKey: 'campaignId' });
RewardSetting.hasMany(CampaignReward, { foreignKey: 'rewardSettingId' });
Media.hasMany(Tenant, { foreignKey: 'logoMediaId' });
Tenant.belongsTo(Media, { foreignKey: 'logoMediaId', as: 'logoMedia' });

const db = {
  sequelize,
  Tenant,
  User,
  Referral,
  Estimate,
  RewardSetting,
  TenantHost,
  TenantSender,
  Product,
  Campaign,
  CampaignReward,
  Media
};

module.exports = db;
