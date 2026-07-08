'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchLog extends Model {
    static associate(models) {
      BranchLog.belongsTo(models.Branch, { foreignKey: 'branchId' });
    }
  }
  BranchLog.init({
    branchId: DataTypes.INTEGER,
    adminId: DataTypes.STRING,
    actionType: DataTypes.STRING,
    reason: DataTypes.TEXT,
    closedUntil: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BranchLog',
  });
  return BranchLog;
};