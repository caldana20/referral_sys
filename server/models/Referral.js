const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Referral = sequelize.define('Referral', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'referral_code_tenant'
  },
  prospectEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  prospectName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  selectedReward: {
    type: DataTypes.STRING, // Changed from ENUM to support dynamic rewards
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Open', 'Wait', 'Closed', 'Expired', 'Used'),
    defaultValue: 'Open'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['code', 'tenantId'],
      name: 'referral_code_tenant'
    }
  ]
});

module.exports = Referral;


