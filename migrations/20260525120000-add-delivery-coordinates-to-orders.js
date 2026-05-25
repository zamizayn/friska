'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'deliveryLatitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
    await queryInterface.addColumn('Orders', 'deliveryLongitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'deliveryLatitude');
    await queryInterface.removeColumn('Orders', 'deliveryLongitude');
  }
};
