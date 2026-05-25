'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'deliveryBoyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'DeliveryBoys',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'deliveryBoyId');
  }
};
