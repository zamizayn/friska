'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.Branch, { foreignKey: 'tenantId' });
    }
  }
  Tenant.init({
    name: DataTypes.STRING,
    phoneNumberId: DataTypes.STRING,
    whatsappToken: DataTypes.TEXT,
    wabaId: DataTypes.STRING,
    verifyToken: DataTypes.STRING,
    onboardingStep: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    password: {
      type: DataTypes.STRING
    },
    webhooksEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    catalogId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    displayMode: {
      type: DataTypes.STRING,
      defaultValue: 'catalog'
    },
    razorpayKeyId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpayKeySecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpayWebhookSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    whatsappSettings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    googleMapsApiKey: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Tenant',
  });
  return Tenant;
};
