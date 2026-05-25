const { DeliveryBoy, Branch, Order } = require('../models');
const { Op } = require('sequelize');
const { sendToTenant, sendToDeliveryBoy } = require('../services/notificationService');

const listDeliveryBoys = async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'branch') {
            where.branchId = req.user.branchId;
        } else if (req.user.role === 'tenant') {
            const branches = await Branch.findAll({
                where: { tenantId: req.user.tenantId },
                attributes: ['id']
            });
            where.branchId = { [Op.in]: branches.map(b => b.id) };
        }

        const deliveryBoys = await DeliveryBoy.findAll({
            where,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            order: [['name', 'ASC']]
        });

        res.json(deliveryBoys);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createDeliveryBoy = async (req, res) => {
    try {
        const { name, phone, password, branchId } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({ error: 'Name, phone, and password are required' });
        }

        const existing = await DeliveryBoy.findOne({ where: { phone } });
        if (existing) {
            return res.status(409).json({ error: 'A delivery boy with this phone already exists' });
        }

        const deliveryBoy = await DeliveryBoy.create({
            name,
            phone,
            password,
            branchId: branchId || req.user.branchId || null,
            status: 'active'
        });

        res.status(201).json(deliveryBoy);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getScope = async (user) => {
    if (user.role === 'branch') return { branchId: user.branchId };
    if (user.role === 'tenant') {
        const branches = await Branch.findAll({
            where: { tenantId: user.tenantId },
            attributes: ['id']
        });
        return { branchId: { [Op.in]: branches.map(b => b.id) } };
    }
    return {};
};

const updateDeliveryBoy = async (req, res) => {
    try {
        const scope = await getScope(req.user);
        const deliveryBoy = await DeliveryBoy.findOne({
            where: { id: req.params.id, ...scope }
        });
        if (!deliveryBoy) return res.status(404).json({ error: 'Delivery boy not found' });

        const { name, phone, password, status } = req.body;
        if (name) deliveryBoy.name = name;
        if (phone) deliveryBoy.phone = phone;
        if (password) deliveryBoy.password = password;
        if (status) deliveryBoy.status = status;

        await deliveryBoy.save();
        res.json(deliveryBoy);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteDeliveryBoy = async (req, res) => {
    try {
        const scope = await getScope(req.user);
        const deliveryBoy = await DeliveryBoy.findOne({
            where: { id: req.params.id, ...scope }
        });
        if (!deliveryBoy) return res.status(404).json({ error: 'Delivery boy not found' });

        await deliveryBoy.destroy();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const assignDeliveryBoy = async (req, res) => {
    try {
        const { deliveryBoyId } = req.body;
        const order = await Order.findByPk(req.params.id);

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending orders can be assigned' });
        }

        if (deliveryBoyId) {
            const deliveryBoy = await DeliveryBoy.findOne({
                where: { id: deliveryBoyId, status: 'active' },
                include: [{ model: Branch, as: 'branch', attributes: ['name'] }]
            });
            if (!deliveryBoy) return res.status(404).json({ error: 'Delivery boy not found or inactive' });

            order.deliveryBoyId = deliveryBoyId;
            await order.save();

            // Notify delivery boy
            sendToDeliveryBoy(deliveryBoyId, `📦 New Delivery #${order.id}`,
                `Order #${order.id} has been assigned to you. Customer: ${order.customerPhone}`,
                'new_delivery',
                { orderId: order.id, type: 'new_delivery' }
            ).catch(() => {});

            // Notify tenant
            const tenantId = req.user.tenantId;
            if (tenantId) {
                sendToTenant(tenantId, `📦 Order #${order.id} Assigned`,
                    `Assigned to ${deliveryBoy.name} (${deliveryBoy.phone})`,
                    'order_update',
                    { orderId: order.id, deliveryBoyId }
                ).catch(() => {});
            }
        } else {
            order.deliveryBoyId = null;
            await order.save();
        }

        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAvailableOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = await req.getScope();
        where.status = 'pending';
        where.deliveryBoyId = null;

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: require('../models').Customer, as: 'customer', attributes: ['name', 'phone'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'latitude', 'longitude'] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({ data: rows, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    listDeliveryBoys,
    createDeliveryBoy,
    updateDeliveryBoy,
    deleteDeliveryBoy,
    assignDeliveryBoy,
    getAvailableOrders
};
