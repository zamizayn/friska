'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CustomerAddresses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Customers',
          key: 'phone'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      formattedAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      label: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Default'
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('CustomerAddresses');
  }
};
