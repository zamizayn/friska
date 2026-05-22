'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tenants');
    if (!tableInfo.razorpayKeyId) {
      await queryInterface.addColumn('Tenants', 'razorpayKeyId', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableInfo.razorpayKeySecret) {
      await queryInterface.addColumn('Tenants', 'razorpayKeySecret', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tenants');
    if (tableInfo.razorpayKeyId) {
      await queryInterface.removeColumn('Tenants', 'razorpayKeyId');
    }
    if (tableInfo.razorpayKeySecret) {
      await queryInterface.removeColumn('Tenants', 'razorpayKeySecret');
    }
  }
};
