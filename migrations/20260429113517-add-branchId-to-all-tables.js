'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add branchId to all main tables
    await queryInterface.addColumn('Categories', 'branchId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow NULL for existing data, will seed later
      references: { model: 'Branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Products', 'branchId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Orders', 'branchId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Customers', 'branchId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Categories', 'branchId');
    await queryInterface.removeColumn('Products', 'branchId');
    await queryInterface.removeColumn('Orders', 'branchId');
    await queryInterface.removeColumn('Customers', 'branchId');
  }
};
