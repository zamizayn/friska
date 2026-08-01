'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const branchTable = await queryInterface.describeTable('Branches');
    if (!branchTable.closeReason) {
      await queryInterface.addColumn('Branches', 'closeReason', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const branchTable = await queryInterface.describeTable('Branches');
    if (branchTable.closeReason) {
      await queryInterface.removeColumn('Branches', 'closeReason');
    }
  }
};
