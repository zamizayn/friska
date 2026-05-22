'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tenants');
    if (!tableInfo.razorpayWebhookSecret) {
      await queryInterface.addColumn('Tenants', 'razorpayWebhookSecret', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tenants');
    if (tableInfo.razorpayWebhookSecret) {
      await queryInterface.removeColumn('Tenants', 'razorpayWebhookSecret');
    }
  }
};
