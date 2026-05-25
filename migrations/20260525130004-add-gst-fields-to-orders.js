'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'gstRate', {
      type: Sequelize.FLOAT,
      defaultValue: 0
    });
    await queryInterface.addColumn('Orders', 'gstAmount', {
      type: Sequelize.FLOAT,
      defaultValue: 0
    });
    await queryInterface.addColumn('Orders', 'subtotalBeforeTax', {
      type: Sequelize.FLOAT,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'gstRate');
    await queryInterface.removeColumn('Orders', 'gstAmount');
    await queryInterface.removeColumn('Orders', 'subtotalBeforeTax');
  }
};
