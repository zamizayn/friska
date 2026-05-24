'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Branches', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
    await queryInterface.addColumn('Branches', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });
    await queryInterface.addColumn('Branches', 'deliveryRadius', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn('Branches', 'address', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Branches', 'latitude');
    await queryInterface.removeColumn('Branches', 'longitude');
    await queryInterface.removeColumn('Branches', 'deliveryRadius');
    await queryInterface.removeColumn('Branches', 'address');
  }
};
