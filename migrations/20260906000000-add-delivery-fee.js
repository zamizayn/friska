'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Branches', 'deliveryFeeConfig', {
      type: Sequelize.JSONB,
      allowNull: true
    });
    await queryInterface.addColumn('Orders', 'deliveryFee', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('Orders', 'deliveryDistanceKm', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Orders', 'deliveryDistanceKm');
    await queryInterface.removeColumn('Orders', 'deliveryFee');
    await queryInterface.removeColumn('Branches', 'deliveryFeeConfig');
  }
};
