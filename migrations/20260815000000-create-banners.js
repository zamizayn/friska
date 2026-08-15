'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('Banners')) {
      await queryInterface.createTable('Banners', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        title: {
          type: Sequelize.STRING,
          allowNull: true
        },
        image: {
          type: Sequelize.STRING,
          allowNull: false
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        branchId: {
          type: Sequelize.INTEGER,
          allowNull: false
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
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Banners');
  }
};