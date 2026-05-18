'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GlobalConfig extends Model {
    static associate(models) {
      // no associations
    }
  }
  GlobalConfig.init({
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'GlobalConfig',
  });
  return GlobalConfig;
};
