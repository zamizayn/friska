'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (!tableInfo.paymentTransactionId) {
      await queryInterface.addColumn('Orders', 'paymentTransactionId', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Orders');
    if (tableInfo.paymentTransactionId) {
      await queryInterface.removeColumn('Orders', 'paymentTransactionId');
    }
  }
};
