const { Order, Customer, Product, Branch, Tenant } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage, sendButtonMessage, uploadMedia, sendDocumentMessage } = require('../services/whatsappService');
const { generateInvoice } = require('../services/invoiceService');
const fs = require('fs');

const createOrder = async (req, res) => {
    try {
        await Customer.upsert({
            phone: req.body.customerPhone,
            name: req.body.customerName || '',
            lastInteraction: new Date()
        });

        const order = await Order.create(req.body);

        const items = Array.isArray(req.body.items) ? req.body.items : JSON.parse(req.body.items || '[]');
        for (const item of items) {
            await Product.decrement('stock', { by: item.quantity, where: { id: item.id } });
        }

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
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const stats = {
            completed: await Order.count({ where: { ...await req.getScope(), status: 'delivered' } }),
            pending: await Order.count({ where: { ...await req.getScope(), status: { [Op.in]: ['pending', 'shipped'] } } }),
            collected: await Order.sum('total', { where: { ...await req.getScope(), paymentStatus: 'paid' } }) || 0,
            pendingCollection: await Order.sum('total', { where: { ...await req.getScope(), paymentStatus: { [Op.or]: ['unpaid', null, { [Op.ne]: 'paid' }] } } }) || 0
        };

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            summary: stats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
            msg = `✅ *Update on your Order #${order.id}*\n\nYour order has been successfully delivered! Thank you for shopping with WStore!`;
        } else if (order.status === 'cancelled') {
            msg = `❌ *Update on your Order #${order.id}*\n\nYour order has been cancelled.\n\n*Reason:* ${order.cancellationReason || 'Not specified'}`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${order.status.toUpperCase()}*.`;
        }

        try {
            const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);

            if (order.status === 'delivered') {
                try {
                    const tenant = await Tenant.findByPk(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
                    const branch = order.branchId ? await Branch.findByPk(order.branchId) : null;

                    const pdfPath = await generateInvoice(order, tenant, branch);
                    const mediaId = await uploadMedia(pdfPath, 'application/pdf', config);
                    await sendDocumentMessage(order.customerPhone, mediaId, `Invoice_${order.id}.pdf`, config);

                    fs.unlinkSync(pdfPath);
                } catch (invError) {
                    console.error("Invoice Automation Failed:", invError.message);
                }

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

        res.json(order);
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

module.exports = {
    createOrder,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus
};
