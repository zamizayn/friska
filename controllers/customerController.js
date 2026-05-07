const { Customer, Order, CustomerLog, Category, Product } = require('../models');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Customer.findAndCountAll({
            where: await req.getScope(),
            limit,
            offset,
            order: [['lastInteraction', 'DESC']]
        });

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getCustomerOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Order.findAndCountAll({
            where: { customerPhone: req.params.phone },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getCustomerLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await CustomerLog.findAndCountAll({
            where: await req.getScope({ customerPhone: req.params.phone }),
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        const enrichedLogs = await Promise.all(rows.map(async (log) => {
            const data = log.toJSON();
            const { details, actionType } = data;

            if (actionType === 'CATEGORY_VIEWED' && details.categoryId && !details.categoryName) {
                const cat = await Category.findByPk(details.categoryId);
                if (cat) details.categoryName = cat.name;
            } else if ((actionType === 'PRODUCT_VIEWED' || actionType === 'ADDED_TO_CART') && details.productId && !details.productName) {
                const prod = await Product.findByPk(details.productId);
                if (prod) details.productName = prod.name;
            }
            return data;
        }));

        res.json({
            data: enrichedLogs,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const broadcastMessage = async (req, res) => {
    const { phones, message } = req.body;
    if (!phones || !message) return res.status(400).json({ error: 'Missing phones or message' });

    let successCount = 0;
    let failCount = 0;

    for (const phone of phones) {
        try {
            const config = await getTenantConfig(req.user.tenantId);
            await sendTextMessage(phone, message, config);
            successCount++;
        } catch (e) {
            console.error(`Broadcast failed for ${phone}:`, e.message);
            failCount++;
        }
    }

    res.json({ successCount, failCount });
};

module.exports = {
    getAllCustomers,
    getCustomerOrders,
    getCustomerLogs,
    broadcastMessage
};
