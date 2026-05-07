'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tenants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      phoneNumberId: {
        type: Sequelize.STRING
      },
      whatsappToken: {
        type: Sequelize.STRING
      },
      wabaId: {
        type: Sequelize.STRING
      },
      verifyToken: {
        type: Sequelize.STRING
      },
      onboardingStep: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tenants');
  }
};
