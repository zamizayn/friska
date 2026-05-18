'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenants', 'contactName', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Tenants', 'contactPhone', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Tenants', 'contactEmail', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Tenants', 'paymentStatus', {
      type: Sequelize.ENUM('pending', 'paid'),
      defaultValue: 'pending'
    });
    await queryInterface.addColumn('Tenants', 'registrationPaymentId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenants', 'contactName');
    await queryInterface.removeColumn('Tenants', 'contactPhone');
    await queryInterface.removeColumn('Tenants', 'contactEmail');
    await queryInterface.removeColumn('Tenants', 'paymentStatus');
    await queryInterface.removeColumn('Tenants', 'registrationPaymentId');
    // Note: To truly undo ENUM change in some DBs you might need more complex logic, 
    // but for simple dev/test this is fine.
  }
};
