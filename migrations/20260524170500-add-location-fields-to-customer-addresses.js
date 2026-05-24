'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CustomerAddresses', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
    await queryInterface.addColumn('CustomerAddresses', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('CustomerAddresses', 'latitude');
    await queryInterface.removeColumn('CustomerAddresses', 'longitude');
  }
};
