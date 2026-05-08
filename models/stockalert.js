'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class StockAlert extends Model {
    static associate(models) {
      StockAlert.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
      StockAlert.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }
  }
  StockAlert.init({
    productId: DataTypes.INTEGER,
    customerPhone: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    branchId: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('pending', 'notified'),
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'StockAlert',
  });
  return StockAlert;
};
