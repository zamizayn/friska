'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // We use a check to avoid errors if the column was already added manually
    const tableInfo = await queryInterface.describeTable('Products');
    if (!tableInfo.priority) {
      await queryInterface.addColumn('Products', 'priority', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Products', 'priority');
  }
};
