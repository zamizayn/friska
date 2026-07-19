const { Op } = require('sequelize');
const { Customer, CustomerAddress, Order, CustomerLog, Category, Product, sequelize } = require('../models');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const orderCountSubquery = `(
    SELECT COUNT(*) FROM "Orders"
    WHERE "Orders"."customerPhone" = "Customer"."phone"
      AND "Orders".status != 'cancelled'
)`;

const getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const where = await req.getScope();

        if (req.query.search) {
            where[Op.or] = [
                { phone: { [Op.iLike]: `%${req.query.search}%` } },
                { name: { [Op.iLike]: `%${req.query.search}%` } }
            ];
        }

        const orderFilter = req.query.orderFilter || 'all';

        if (orderFilter === 'none') {
            where[Op.and] = sequelize.literal(orderCountSubquery + ' = 0');
        }

        let order;
        if (orderFilter === 'most') {
            order = [[sequelize.literal('"orderCount"'), 'DESC']];
        } else if (orderFilter === 'least') {
            order = [[sequelize.literal('"orderCount"'), 'ASC']];
        } else {
            order = [['lastInteraction', 'DESC']];
        }

        const { count, rows } = await Customer.findAndCountAll({
            where,
            attributes: {
                include: [
                    [sequelize.literal(orderCountSubquery), 'orderCount']
                ]
            },
            limit,
            offset,
            order
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

const getCustomerAddresses = async (req, res) => {
    try {
        const addresses = await CustomerAddress.findAll({
            where: { customerPhone: req.params.phone },
            order: [['createdAt', 'DESC']]
        });
        res.json(addresses);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addCustomerAddress = async (req, res) => {
    try {
        const { address, formattedAddress } = req.body;
        if (!address) return res.status(400).json({ error: 'Address is required' });

        const addr = await CustomerAddress.create({
            customerPhone: req.params.phone,
            address,
            formattedAddress: formattedAddress || address
        });
        res.status(201).json(addr);
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
    getCustomerAddresses,
    addCustomerAddress,
    broadcastMessage
};
