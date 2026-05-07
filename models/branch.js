'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Branch.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
      Branch.hasMany(models.Category, { foreignKey: 'branchId' });
      Branch.hasMany(models.Product, { foreignKey: 'branchId' });
      Branch.hasMany(models.Order, { foreignKey: 'branchId' });
      Branch.hasMany(models.Customer, { foreignKey: 'branchId' });
      Branch.hasMany(models.Offer, { foreignKey: 'branchId' });
    }
  }
  Branch.init({
    name: DataTypes.STRING,
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    openingTime: DataTypes.STRING,
    closingTime: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Branch',
  });
  return Branch;
};