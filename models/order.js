'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }
  }
  Order.init({
    customerPhone: DataTypes.STRING,
    address: DataTypes.TEXT,
    items: DataTypes.JSONB,
    total: DataTypes.FLOAT,
    status: DataTypes.STRING,
    branchId: DataTypes.INTEGER,
    cancellationReason: DataTypes.STRING,
    paymentMethod: DataTypes.STRING,
    paymentStatus: DataTypes.STRING,
    discountAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    appliedOfferCode: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};