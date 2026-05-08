'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Customer.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
      Customer.hasMany(models.Order, {
        foreignKey: 'customerPhone',
        sourceKey: 'phone',
        as: 'orders'
      });
    }
  }
  Customer.init({
    phone: DataTypes.STRING,
    name: DataTypes.STRING,
    lastInteraction: DataTypes.DATE,
    branchId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Customer',
  });
  return Customer;
};