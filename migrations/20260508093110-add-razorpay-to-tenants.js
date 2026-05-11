'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenants', 'razorpayKeyId', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Tenants', 'razorpayKeySecret', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenants', 'razorpayKeyId');
    await queryInterface.removeColumn('Tenants', 'razorpayKeySecret');
  }
};
