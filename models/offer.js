'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Offer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Offer.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }
  }
  Offer.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    discountType: {
      type: DataTypes.ENUM('percentage', 'flat'),
      defaultValue: 'flat'
    },
    discountValue: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    minOrderValue: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    maxDiscount: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    usageType: {
      type: DataTypes.ENUM('unlimited', 'first_order_only', 'once_per_customer'),
      defaultValue: 'unlimited'
    },
    isDynamic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Offer',
  });
  return Offer;
};
