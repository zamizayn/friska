'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // No strict FK
    }
  }
  Notification.init({
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: true }, // 'new_order', 'support_request', 'low_stock'
    tenantId: { type: DataTypes.INTEGER, allowNull: true },
    branchId: { type: DataTypes.INTEGER, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: true }, // extra metadata like orderId
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    sequelize,
    modelName: 'Notification',
  });
  return Notification;
};
