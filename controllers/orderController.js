const { Order, Customer, Product, Branch, Tenant, DeliveryBoy } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTemplateMessage, sendTextMessage, sendButtonMessage, uploadMedia, sendDocumentMessage } = require('../services/whatsappService');
const { generateInvoice } = require('../services/invoiceService');
const { generateOrdersReport } = require('../services/orderExportService');
const orderService = require('../services/orderService');
const { calculateDeliveryFee } = require('../services/deliveryFeeService');
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

// Loads the branch for a manual order / fee quote and enforces who may use it.
// Returns the branch, null when no branchId was given, or false after sending a 403/404.
const loadBranchForOrder = async (req, res, branchId) => {
    const id = req.user?.role === 'branch' ? req.user.branchId : branchId;
    if (id === undefined || id === null || id === '') return null;
    const branch = await Branch.findByPk(id);
    if (!branch) { res.status(404).json({ error: 'Branch not found' }); return false; }
    if (req.user?.role === 'tenant' && branch.tenantId !== req.user.tenantId) {
        res.status(403).json({ error: 'Access denied' }); return false;
    }
    return branch;
};

// Live delivery fee for the manual order form
const quoteDeliveryFee = async (req, res) => {
    try {
        const { branchId, subtotal, lat, lng } = req.body;
        const branch = await loadBranchForOrder(req, res, branchId);
        if (branch === false) return;
        const config = branch?.deliveryFeeConfig;
        const { fee, distanceKm } = calculateDeliveryFee({ branch, subtotal: Number(subtotal) || 0, lat, lng });
        res.json({
            fee,
            distanceKm: distanceKm == null ? null : Math.round(distanceKm * 100) / 100,
            enabled: !!(config && config.enabled !== false),
            // True when part of the fee depends on distance (so a missing location makes the fee a guess)
            usesDistance: !!(config && config.enabled !== false && config.distanceSlabs)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createOrder = async (req, res) => {
    try {
        const branch = await loadBranchForOrder(req, res, req.body.branchId);
        if (branch === false) return;

        // `total` from the form is the amount after discount. Add the delivery fee on top: the branch's
        // automatic fee, unless the admin typed an override (including 0 to waive it).
        const afterDiscount = Math.max(0, Number(req.body.total) || 0);
        const { fee: autoFee, distanceKm } = calculateDeliveryFee({
            branch, subtotal: afterDiscount, lat: req.body.deliveryLatitude, lng: req.body.deliveryLongitude
        });
        let deliveryFee = autoFee;
        const override = req.body.deliveryFee;
        if (override !== undefined && override !== null && override !== '') {
            deliveryFee = Number(override);
            if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
                return res.status(400).json({ error: 'deliveryFee must be a number of 0 or more' });
            }
        }

        const existingCustomer = await Customer.findOne({
            where: { phone: req.body.customerPhone }
        });

        if (existingCustomer) {
            await existingCustomer.update({
                name: req.body.customerName || '',
                lastInteraction: new Date()
            });
        } else {
            await Customer.create({
                phone: req.body.customerPhone,
                name: req.body.customerName || '',
                lastInteraction: new Date()
            });
        }

        const order = await Order.create({
            ...req.body,
            ...(req.user?.role === 'branch' ? { branchId: req.user.branchId } : {}),
            total: afterDiscount + deliveryFee,
            deliveryFee,
            deliveryDistanceKm: distanceKm == null ? null : Math.round(distanceKm * 100) / 100,
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
            pendingCollection: await Order.sum('total', { where: { ...where, status: where.status || { [Op.ne]: 'cancelled' }, paymentStatus: { [Op.or]: ['unpaid', null, { [Op.ne]: 'paid' }] } } }) || 0,
            // Same as the "Offer Applied" figure in the PDF export: discounts on non-cancelled orders
            offerApplied: where.status === 'cancelled'
                ? 0
                : await Order.sum('discountAmount', { where: { ...where, status: where.status || { [Op.ne]: 'cancelled' } } }) || 0
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

const exportOrdersPdf = async (req, res) => {
    try {
        const { status, branchId, search, startDate, endDate } = req.query;
        const where = await req.getScope();

        if (status && status !== 'cancelled') where.status = status;
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

        where.status = {
            ...(where.status ? { [Op.eq]: where.status } : {}),
            [Op.ne]: 'cancelled'
        };

        const orders = await Order.findAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'latitude', 'longitude'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 500
        });

        const plainOrders = orders.map(o => o.get({ plain: true }));
        const branchIdToLookup = branchId || req.user?.branchId;
        const branch = branchIdToLookup ? await Branch.findByPk(branchIdToLookup, { attributes: ['name', 'address'] }) : null;

        const offerApplied = await Order.sum('discountAmount', { where: { ...where, status: { [Op.ne]: 'cancelled' } } }) || 0;
        const totalSalesNet = await Order.sum('total', { where: { ...where, status: { [Op.ne]: 'cancelled' } } }) || 0;
        const summary = {
            totalSales: totalSalesNet + offerApplied,
            offerApplied,
            balanceInHand: await Order.sum('total', { where: { ...where, status: { [Op.ne]: 'cancelled' }, paymentStatus: 'paid' } }) || 0,
            pendingPayment: await Order.sum('total', { where: { ...where, status: { [Op.ne]: 'cancelled' }, paymentStatus: { [Op.or]: ['unpaid', null, { [Op.ne]: 'paid' }] } } }) || 0,
            deliveryFees: await Order.sum('deliveryFee', { where: { ...where, status: { [Op.ne]: 'cancelled' } } }) || 0
        };

        const pdfPath = await generateOrdersReport(plainOrders, { status, startDate, endDate }, branch, summary);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=orders_report.pdf`);
        const readStream = fs.createReadStream(pdfPath);
        readStream.pipe(res);
        readStream.on('end', () => fs.unlinkSync(pdfPath));
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

const sendOrderStatusNotification = async (order, statusLabel, config) => {
    const customer = await Customer.findOne({ where: { phone: order.customerPhone } });
    const custName = customer?.name || 'Customer';

    try {
        await sendTemplateMessage(order.customerPhone, 'order_template', [custName, String(order.id), statusLabel], config);
    } catch (e) {
        console.error('[Order Status] Template failed, falling back to text:', e.message);
        await sendTextMessage(
            order.customerPhone,
            `*Order #${order.id} Status Update*\n\nHello ${custName}, your order is now: *${statusLabel}*.\nThank you for choosing Friska!`,
            config
        );
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

        // Restock if cancelled
        if (order.status === 'cancelled' && Array.isArray(order.items)) {
            for (const item of order.items) {
                if (item.id) {
                    await Product.increment('stock', {
                        by: item.quantity,
                        where: { id: item.id }
                    }).catch(e => console.error(`[Restock Error] Product ${item.id}:`, e.message));
                }
            }
        }

        res.json(order);

        // Fire-and-forget: notifications, invoice, and WhatsApp messages (non-blocking)
        try {
            const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
            const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);

            await sendOrderStatusNotification(order, statusLabel, config);

            if (order.status === 'delivered') {
                sendDeliveryInvoice(order, config).catch(e =>
                    console.error("Invoice Automation Failed:", e.message)
                );
                const rateMsg = `Thank you for shopping with Friska! How was your experience?`;
                await sendButtonMessage(order.customerPhone, rateMsg, [
                    { id: `rate_${order.id}`, title: 'Rate Order' },
                    { id: 'menu', title: 'Main Menu' }
                ], config);
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

        if (req.body.paymentStatus !== undefined) order.paymentStatus = req.body.paymentStatus;
        if (req.body.collectedVia !== undefined) order.collectedVia = req.body.collectedVia;
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
            // Restock if cancelled
            if (status === 'cancelled' && Array.isArray(order.items)) {
                for (const item of order.items) {
                    if (item.id) {
                        await Product.increment('stock', {
                            by: item.quantity,
                            where: { id: item.id }
                        }).catch(e => console.error(`[Restock Error] Product ${item.id}:`, e.message));
                    }
                }
            }
        }

        res.json({ updated: count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const trySendStatusNotification = async (order, status) => {
    try {
        const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

        await sendOrderStatusNotification(order, statusLabel, config);

        if (status === 'delivered') {
            sendDeliveryInvoice(order, config).catch(e =>
                console.error("Invoice Automation Failed:", e.message)
            );
            const rateMsg = `Thank you for shopping with Friska! How was your experience?`;
            await sendButtonMessage(order.customerPhone, rateMsg, [
                { id: `rate_${order.id}`, title: 'Rate Order' },
                { id: 'menu', title: 'Main Menu' }
            ], config);
        }
    } catch (e) {
        console.error("WhatsApp notification error:", e.message);
    }
};

module.exports = {
    createOrder,
    quoteDeliveryFee,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus,
    bulkUpdateOrderStatus,
    exportOrdersPdf
};
