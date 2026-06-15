const { Order, Customer, Product, Branch, Tenant, DeliveryBoy } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage, sendButtonMessage, uploadMedia, sendDocumentMessage } = require('../services/whatsappService');
const { generateInvoice } = require('../services/invoiceService');
const orderService = require('../services/orderService');
const fs = require('fs');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createOrder = async (req, res) => {
    try {
        const existingCustomer = await Customer.findOne({
            where: { phone: req.body.customerPhone }
        });

        await Customer.upsert({
            phone: req.body.customerPhone,
            name: req.body.customerName || '',
            lastInteraction: new Date()
        });

        const order = await Order.create({
            ...req.body,
            isNewCustomer: !existingCustomer
        });

        // Centralized post-order logic (Stock deduction, Offer tracking)
        await orderService.handleOrderSuccess(order);

        res.status(201).json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, branchId, search, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = await req.getScope();

        if (status) where.status = status;
        if (branchId) where.branchId = branchId;
        if (search) {
            where[Op.or] = [
                { id: isNaN(search) ? -1 : parseInt(search) },
                { customerPhone: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'latitude', 'longitude'] },
                { model: DeliveryBoy, as: 'deliveryBoy', attributes: ['id', 'name', 'phone', 'status'] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const dataWithDistance = rows.map(order => {
            const plain = order.get({ plain: true });
            let distance = null;
            if (plain.branch?.latitude && plain.branch?.longitude && plain.deliveryLatitude && plain.deliveryLongitude) {
                distance = calculateDistance(
                    parseFloat(plain.branch.latitude),
                    parseFloat(plain.branch.longitude),
                    parseFloat(plain.deliveryLatitude),
                    parseFloat(plain.deliveryLongitude)
                );
                distance = Math.round(distance * 100) / 100;
            }
            return { ...plain, distanceFromBranch: distance };
        });

        const stats = {
            completed: await Order.count({ where: { ...where, status: 'delivered' } }),
            pending: await Order.count({ where: { ...where, status: { [Op.in]: ['pending', 'shipped'] } } }),
            collected: await Order.sum('total', { where: { ...where, paymentStatus: 'paid' } }) || 0,
            pendingCollection: await Order.sum('total', { where: { ...where, paymentStatus: { [Op.or]: ['unpaid', null, { [Op.ne]: 'paid' }] } } }) || 0
        };

        res.json({
            data: dataWithDistance,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            summary: stats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const sendDeliveryInvoice = async (order, config) => {
    const tenant = await Tenant.findByPk(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
    const branch = order.branchId ? await Branch.findByPk(order.branchId) : null;

    const customer = await Customer.findOne({ where: { phone: order.customerPhone } });
    if (customer) {
        order.customerName = customer.name;
    }

    const pdfPath = await generateInvoice(order, tenant, branch);
    const mediaId = await uploadMedia(pdfPath, 'application/pdf', config);
    await sendDocumentMessage(order.customerPhone, mediaId, `Invoice_${order.id}.pdf`, config);
    fs.unlinkSync(pdfPath);
};

const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (req.body.status === 'cancelled' && req.body.cancellationReason) {
            order.cancellationReason = req.body.cancellationReason;
        }
        order.status = req.body.status;
        await order.save();

        let msg = '';
        if (order.status === 'shipped') {
            msg = `🚚 *Update on your Order #${order.id}*\n\nGreat news! Your order has been shipped and is on its way to you!`;
        } else if (order.status === 'delivered') {
            msg = `✅ *Update on your Order #${order.id}*\n\nYour order has been successfully delivered! Thank you for shopping with Friska!`;
        } else if (order.status === 'cancelled') {
            msg = `❌ *Update on your Order #${order.id}*\n\nYour order has been cancelled.\n\n*Reason:* ${order.cancellationReason || 'Not specified'}`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${order.status.toUpperCase()}*.`;
        }

        res.json(order);

        // Fire-and-forget: notifications, invoice, and WhatsApp messages (non-blocking)
        try {
            const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);

            if (order.status === 'delivered') {
                sendDeliveryInvoice(order, config).catch(e =>
                    console.error("Invoice Automation Failed:", e.message)
                );

                await sendButtonMessage(order.customerPhone, msg, [
                    { id: `rate_${order.id}`, title: 'Rate Order ⭐' },
                    { id: 'menu', title: 'Main Menu' }
                ], config);
            } else {
                await sendTextMessage(order.customerPhone, msg, config);
            }
        } catch (e) {
            console.error("WhatsApp notification error:", e.message);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updatePaymentStatus = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.paymentStatus = req.body.paymentStatus;
        await order.save();
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const bulkUpdateOrderStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }

        const [count] = await Order.update(
            { status },
            { where: { id: { [Op.in]: ids } } }
        );

        // Fire-and-forget notifications
        const orders = await Order.findAll({
            where: { id: { [Op.in]: ids } }
        });
        for (const order of orders) {
            trySendStatusNotification(order, status);
        }

        res.json({ updated: count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const trySendStatusNotification = async (order, status) => {
    try {
        const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
        let msg = '';
        if (status === 'shipped') {
            msg = `🚚 *Update on your Order #${order.id}*\n\nGreat news! Your order has been shipped and is on its way to you!`;
        } else if (status === 'delivered') {
            msg = `✅ *Update on your Order #${order.id}*\n\nYour order has been successfully delivered! Thank you for shopping with Friska!`;

            sendDeliveryInvoice(order, config).catch(e =>
                console.error("Invoice Automation Failed:", e.message)
            );

            await sendButtonMessage(order.customerPhone, msg, [
                { id: `rate_${order.id}`, title: 'Rate Order ⭐' },
                { id: 'menu', title: 'Main Menu' }
            ], config);
            return;
        } else if (status === 'cancelled') {
            msg = `❌ *Update on your Order #${order.id}*\n\nYour order has been cancelled.`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${status.toUpperCase()}*.`;
        }
        await sendTextMessage(order.customerPhone, msg, config);
    } catch (e) {
        console.error(`Notification error for order #${order.id}:`, e.message);
    }
};

module.exports = {
    createOrder,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus,
    bulkUpdateOrderStatus
};
