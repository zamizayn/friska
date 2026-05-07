'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Handle partial migration - create tables if they don't exist
    try {
      await queryInterface.createTable('FcmTokens', {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
        token: { type: Sequelize.STRING, allowNull: false },
        adminId: { type: Sequelize.INTEGER, allowNull: false },
        tenantId: { type: Sequelize.INTEGER, allowNull: true },
        branchId: { type: Sequelize.INTEGER, allowNull: true },
        role: { type: Sequelize.STRING, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    try {
      await queryInterface.createTable('Notifications', {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
        title: { type: Sequelize.STRING, allowNull: false },
        body: { type: Sequelize.STRING, allowNull: false },
        type: { type: Sequelize.STRING, allowNull: true },
        tenantId: { type: Sequelize.INTEGER, allowNull: true },
        branchId: { type: Sequelize.INTEGER, allowNull: true },
        data: { type: Sequelize.JSONB, allowNull: true },
        isRead: { type: Sequelize.BOOLEAN, defaultValue: false },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    // Create indexes with explicit names to avoid conflicts
    try { await queryInterface.addIndex('FcmTokens', ['tenantId'], { name: 'idx_fcmtokens_tenantid' }); } catch (e) { /* index may exist */ }
    try { await queryInterface.addIndex('Notifications', ['tenantId'], { name: 'idx_notifications_tenantid' }); } catch (e) { /* index may exist */ }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Notifications');
    await queryInterface.dropTable('FcmTokens');
  }
};
