'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Products', 'image', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.changeColumn('Products', 'retailerId', {
      type: Sequelize.TEXT,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Products', 'image', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('Products', 'retailerId', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
