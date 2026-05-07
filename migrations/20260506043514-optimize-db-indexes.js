'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Products: FULLTEXT index on name, description
    await queryInterface.addIndex('Products', ['name', 'description'], {
      type: 'FULLTEXT',
      name: 'products_name_desc_fulltext'
    });

    // Products: standard index on categoryId, branchId
    await queryInterface.addIndex('Products', ['categoryId', 'branchId'], {
      name: 'products_category_branch_idx'
    });

    // Orders: standard index on customerPhone, createdAt
    await queryInterface.addIndex('Orders', ['customerPhone', 'createdAt'], {
      name: 'orders_customer_phone_created_idx'
    });

    // Customers: standard index on phone, branchId
    await queryInterface.addIndex('Customers', ['phone', 'branchId'], {
      name: 'customers_phone_branch_idx'
    });

    // Branches: standard index on tenantId
    await queryInterface.addIndex('Branches', ['tenantId'], {
      name: 'branches_tenant_idx'
    });

    // Tenants: standard index on phoneNumberId, isActive
    await queryInterface.addIndex('Tenants', ['phoneNumberId', 'isActive'], {
      name: 'tenants_phone_active_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Products', 'products_name_desc_fulltext');
    await queryInterface.removeIndex('Products', 'products_category_branch_idx');
    await queryInterface.removeIndex('Orders', 'orders_customer_phone_created_idx');
    await queryInterface.removeIndex('Customers', 'customers_phone_branch_idx');
    await queryInterface.removeIndex('Branches', 'branches_tenant_idx');
    await queryInterface.removeIndex('Tenants', 'tenants_phone_active_idx');
  }
};
