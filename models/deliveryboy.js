'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeliveryBoy extends Model {
    static associate(models) {
      DeliveryBoy.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
      DeliveryBoy.hasMany(models.Order, {
        foreignKey: 'deliveryBoyId',
        as: 'orders'
      });
    }
  }
  DeliveryBoy.init({
    name: DataTypes.STRING,
    phone: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    branchId: DataTypes.INTEGER,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'DeliveryBoy',
  });
  return DeliveryBoy;
};
