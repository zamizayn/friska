'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CustomerLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customerPhone: {
        type: Sequelize.STRING
      },
      tenantId: {
        type: Sequelize.INTEGER
      },
      branchId: {
        type: Sequelize.INTEGER
      },
      actionType: {
        type: Sequelize.STRING
      },
      details: {
        type: Sequelize.JSONB
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
    await queryInterface.addIndex('CustomerLogs', ['customerPhone']);
    await queryInterface.addIndex('CustomerLogs', ['tenantId']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CustomerLogs');
  }
};