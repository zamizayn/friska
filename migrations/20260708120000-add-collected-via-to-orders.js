'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (!tableInfo.collectedVia) {
      await queryInterface.addColumn('Orders', 'collectedVia', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (tableInfo.collectedVia) {
      await queryInterface.removeColumn('Orders', 'collectedVia');
    }
  }
};
