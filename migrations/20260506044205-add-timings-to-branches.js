'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Branches', 'openingTime', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '00:00'
    });
    await queryInterface.addColumn('Branches', 'closingTime', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '23:59'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Branches', 'openingTime');
    await queryInterface.removeColumn('Branches', 'closingTime');
  }
};
