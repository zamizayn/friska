'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Offers table
    await queryInterface.createTable('Offers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      discountType: {
        type: Sequelize.ENUM('percentage', 'flat'),
        defaultValue: 'flat'
      },
      discountValue: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      minOrderValue: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      maxDiscount: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      usageType: {
        type: Sequelize.ENUM('unlimited', 'first_order_only', 'once_per_customer'),
        defaultValue: 'unlimited'
      },
      isDynamic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      branchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // 2. Add discount columns to Orders
    await queryInterface.addColumn('Orders', 'discountAmount', {
      type: Sequelize.FLOAT,
      defaultValue: 0
    });
    await queryInterface.addColumn('Orders', 'appliedOfferCode', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'appliedOfferCode');
    await queryInterface.removeColumn('Orders', 'discountAmount');
    await queryInterface.dropTable('Offers');
    // Note: ENUM types in Postgres can be tricky to drop, but for now this is the standard way
  }
};
