'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FcmToken extends Model {
    static associate(models) {
      // No strict FK — we store adminId, tenantId, branchId loosely
    }
  }
  FcmToken.init({
    token: { type: DataTypes.STRING, allowNull: false },
    adminId: { type: DataTypes.INTEGER, allowNull: false },
    tenantId: { type: DataTypes.INTEGER, allowNull: true },
    branchId: { type: DataTypes.INTEGER, allowNull: true },
    role: { type: DataTypes.STRING, allowNull: true }
  }, {
    sequelize,
    modelName: 'FcmToken',
  });
  return FcmToken;
};
