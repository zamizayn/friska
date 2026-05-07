'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CustomerLog.belongsTo(models.Customer, {
        foreignKey: 'customerPhone',
        targetKey: 'phone',
        as: 'customer'
      });
    }
  }
  CustomerLog.init({
    customerPhone: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    branchId: DataTypes.INTEGER,
    actionType: DataTypes.STRING,
    details: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'CustomerLog',
  });
  return CustomerLog;
};