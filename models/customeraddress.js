'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerAddress extends Model {
    static associate(models) {
      CustomerAddress.belongsTo(models.Customer, {
        foreignKey: 'customerPhone',
        targetKey: 'phone',
        as: 'customer'
      });
    }
  }
  CustomerAddress.init({
    customerPhone: DataTypes.STRING,
    address: DataTypes.TEXT,
    formattedAddress: DataTypes.TEXT,
    label: DataTypes.STRING,
    latitude: DataTypes.DECIMAL(10, 8),
    longitude: DataTypes.DECIMAL(11, 8)
  }, {
    sequelize,
    modelName: 'CustomerAddress',
  });
  return CustomerAddress;
};
