'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const branchTable = await queryInterface.describeTable('Branches');
    if (!branchTable.isOpen) {
      await queryInterface.addColumn('Branches', 'isOpen', {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      });
    }
    if (!branchTable.closedUntil) {
      await queryInterface.addColumn('Branches', 'closedUntil', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    const existingTables = await queryInterface.showAllTables();
    if (!existingTables.includes('BranchLogs')) {
      await queryInterface.createTable('BranchLogs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branchId: { type: Sequelize.INTEGER, allowNull: false },
        adminId: { type: Sequelize.STRING, allowNull: false },
        actionType: { type: Sequelize.STRING, allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        closedUntil: { type: Sequelize.STRING, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const branchTable = await queryInterface.describeTable('Branches');
    if (branchTable.isOpen) await queryInterface.removeColumn('Branches', 'isOpen');
    if (branchTable.closedUntil) await queryInterface.removeColumn('Branches', 'closedUntil');

    const existingTables = await queryInterface.showAllTables();
    if (existingTables.includes('BranchLogs')) {
      await queryInterface.dropTable('BranchLogs');
    }
  }
};