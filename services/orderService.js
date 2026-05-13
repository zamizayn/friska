const { Product, Offer } = require('../models');
const { Op } = require('sequelize');

/**
 * Handles all post-creation logic for an order:
 * 1. Deducts stock for products
 * 2. Increments offer usage count and decrements limit
 */
const handleOrderSuccess = async (order) => {
    try {
        // 1. Stock Deduction
        if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
                // Skip catalog items as they don't have product IDs
                if (item.isCatalog || !item.id) continue;
                
                try {
                    await Product.decrement('stock', { 
                        by: item.quantity, 
                        where: { id: item.id } 
                    });
                } catch (e) {
                    console.error(`[Stock Error] Failed for product ${item.id}:`, e.message);
                }
            }
        }

        // 2. Offer Usage Tracking
        if (order.appliedOfferCode) {
            try {
                // Increment usage count for all applied offers
                await Offer.increment('usageCount', { 
                    by: 1,
                    where: { 
                        code: order.appliedOfferCode, 
                        branchId: order.branchId 
                    } 
                });

                // Decrement limit only if a limit exists
                await Offer.decrement('usageLimit', { 
                    by: 1,
                    where: { 
                        code: order.appliedOfferCode, 
                        branchId: order.branchId,
                        usageLimit: { [Op.gt]: 0 }
                    } 
                });
                
                console.log(`[Offer Success] Tracked usage for ${order.appliedOfferCode} on Branch ${order.branchId}`);
            } catch (offerErr) {
                console.error('[Offer Error] Failed to track usage:', offerErr.message);
            }
        }

        return true;
    } catch (error) {
        console.error('[Order Success Helper Error]:', error.message);
        return false;
    }
};

module.exports = {
    handleOrderSuccess
};
