const { Tenant } = require('../models');

/**
 * Helper to get Tenant config for WhatsApp service
 * @param {number} tenantId 
 * @returns {Promise<Object>}
 */
const getTenantConfig = async (tenantId) => {
    if (!tenantId) return {};
    const tenant = await Tenant.findByPk(tenantId);
    return tenant ? {
        phoneNumberId: tenant.phoneNumberId,
        whatsappToken: tenant.whatsappToken,
        catalogId: tenant.catalogId
    } : {};
};

module.exports = { getTenantConfig };
