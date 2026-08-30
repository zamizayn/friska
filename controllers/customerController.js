const { Op } = require('sequelize');
const { Customer, CustomerAddress, Order, CustomerLog, Category, Product, sequelize } = require('../models');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const allTimeOrderCountSubquery = `(
    SELECT COUNT(*) FROM "Orders"
    WHERE "Orders"."customerPhone" = "Customer"."phone"
      AND "Orders".status != 'cancelled'
)`;

const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

const buildDateClause = (startDate, endDate) => {
    const clauses = [];
    if (startDate) clauses.push(`"Orders"."createdAt" >= '${startDate}T00:00:00.000Z'`);
    if (endDate) clauses.push(`"Orders"."createdAt" <= '${endDate}T23:59:59.999Z'`);
    return clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
};

const orderCountSubquery = (dateClause = '') => `(
    SELECT COUNT(*) FROM "Orders"
    WHERE "Orders"."customerPhone" = "Customer"."phone"
      AND "Orders".status = 'delivered'${dateClause}
)`;

const totalSpendSubquery = (dateClause = '') => `(
    SELECT COALESCE(SUM("Orders"."total"), 0) FROM "Orders"
    WHERE "Orders"."customerPhone" = "Customer"."phone"
      AND "Orders".status = 'delivered'${dateClause}
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

        if (req.query.phone) {
            where[Op.or] = [
                { phone: { [Op.iLike]: `%${req.query.phone}%` } }
            ];
        }

        const orderFilter = req.query.orderFilter || 'all';

        const startDate = isValidDate(req.query.startDate) ? req.query.startDate : null;
        const endDate = isValidDate(req.query.endDate) ? req.query.endDate : null;
        const dateClause = buildDateClause(startDate, endDate);

        if (orderFilter === 'none') {
            where[Op.and] = sequelize.literal(allTimeOrderCountSubquery + ' = 0');
        } else if (dateClause) {
            where[Op.and] = sequelize.literal(orderCountSubquery(dateClause) + ' > 0');
        }

        let order;
        if (orderFilter === 'most') {
            order = [[sequelize.literal('"orderCount"'), 'DESC']];
        } else if (orderFilter === 'least') {
            order = [[sequelize.literal('"orderCount"'), 'ASC']];
        } else if (orderFilter === 'spend') {
            order = [[sequelize.literal('"totalSpend"'), 'DESC']];
        } else if (orderFilter === 'spendLeast') {
            order = [[sequelize.literal('"totalSpend"'), 'ASC']];
        } else {
            order = [['lastInteraction', 'DESC']];
        }

        const { count, rows } = await Customer.findAndCountAll({
            where,
            attributes: {
                include: [
                    [sequelize.literal(orderCountSubquery(dateClause)), 'orderCount'],
                    [sequelize.literal(totalSpendSubquery(dateClause)), 'totalSpend']
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
