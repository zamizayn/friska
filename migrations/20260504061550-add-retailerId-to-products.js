'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'retailerId', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'DEFAULT_RETAILER'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Products', 'retailerId');
  }
};
