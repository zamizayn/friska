'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Tenants', 'whatsappToken', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Tenants', 'whatsappToken', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
