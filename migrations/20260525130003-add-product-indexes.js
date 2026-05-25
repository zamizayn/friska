'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Products', ['retailerId'], {
      name: 'products_retailer_id_idx'
    });
    await queryInterface.addIndex('Products', ['branchId'], {
      name: 'products_branch_id_idx'
    });
    await queryInterface.addIndex('CustomerAddresses', ['customerPhone'], {
      name: 'customer_addresses_phone_idx'
    });
    await queryInterface.addIndex('Offers', ['branchId'], {
      name: 'offers_branch_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Products', 'products_retailer_id_idx');
    await queryInterface.removeIndex('Products', 'products_branch_id_idx');
    await queryInterface.removeIndex('CustomerAddresses', 'customer_addresses_phone_idx');
    await queryInterface.removeIndex('Offers', 'offers_branch_id_idx');
  }
};
