'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Offers');

    if (!tableInfo.usageLimit) {
      await queryInterface.addColumn('Offers', 'usageLimit', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableInfo.usageCount) {
      await queryInterface.addColumn('Offers', 'usageCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Offers');
    if (tableInfo.usageLimit) await queryInterface.removeColumn('Offers', 'usageLimit');
    if (tableInfo.usageCount) await queryInterface.removeColumn('Offers', 'usageCount');
  }
};
