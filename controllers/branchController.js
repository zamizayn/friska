const { Branch, Tenant, BranchLog, Customer, CustomerAddress, Order } = require('../models');
const { Op, fn, col } = require('sequelize');
const { calculateDistance } = require('../utils/distance');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { validateDeliveryFeeConfig } = require('../services/deliveryFeeService');

const getAllBranches = async (req, res) => {
    try {
        if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

        let where = {};
        if (req.user.role === 'tenant') {
            if (!req.user.tenantId) return res.json([]);
            where = { tenantId: req.user.tenantId };
        } else if (req.user.role === 'branch') {
            where = { id: req.user.branchId };
        }
        const branches = await Branch.findAll({
            where,
            include: [{ model: Tenant }],
            order: [['name', 'ASC']]
        });
        res.json(branches);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createBranch = async (req, res) => {
    try {
        const data = { ...req.body };
        if ('deliveryFeeConfig' in data) {
            const { config, error } = validateDeliveryFeeConfig(data.deliveryFeeConfig);
            if (error) return res.status(400).json({ error: `Invalid deliveryFeeConfig: ${error}` });
            data.deliveryFeeConfig = config;
        }
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token && token !== 'null') {
                try {
                    const user = jwt.verify(token, JWT_SECRET);
                    if (user && user.role === 'tenant') {
                        data.tenantId = user.tenantId;
                    }
                } catch (err) {
                    console.error("Token verification failed during branch creation:", err.message);
                }
            }
        }

        const branch = await Branch.create(data);
        res.json(branch);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateBranch = async (req, res) => {
    try {
        if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        if (req.user.role === 'tenant' && branch.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.user.role === 'branch' && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updateData = { ...req.body };
        if ('deliveryFeeConfig' in updateData) {
            const { config, error } = validateDeliveryFeeConfig(updateData.deliveryFeeConfig);
            if (error) return res.status(400).json({ error: `Invalid deliveryFeeConfig: ${error}` });
            updateData.deliveryFeeConfig = config;
        }
        if (!updateData.password) {
            delete updateData.password;
        }

        const prevIsOpen = branch.isOpen;
        const newIsOpen = req.body.isOpen;

        if (newIsOpen !== undefined && newIsOpen !== prevIsOpen) {
            await BranchLog.create({
                branchId: branch.id,
                adminId: req.user.username || `branch_${req.user.branchId}` || `tenant_${req.user.tenantId}` || 'unknown',
                actionType: newIsOpen ? 'SHOP_OPENED' : 'SHOP_CLOSED',
                reason: req.body.closeReason || null,
                closedUntil: req.body.closedUntil || null
            });
        }

        if (newIsOpen === true) {
            updateData.closeReason = null;
        }

        await branch.update(updateData);
        res.json(branch);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteBranch = async (req, res) => {
    try {
        if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const branch = await Branch.findByPk(req.params.id);
        if (branch) {
            if ((req.user.role === 'tenant' || req.user.role === 'branch') && branch.tenantId !== req.user.tenantId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await branch.destroy();
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getBranch = async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        if (req.user.role === 'tenant' && branch.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (req.user.role === 'branch' && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(branch);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getBranchLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        if (req.user.role === 'tenant' && branch.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (req.user.role === 'branch' && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { count, rows } = await BranchLog.findAndCountAll({
            where: { branchId: req.params.id },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({ data: rows, total: count, page, totalPages: Math.ceil(count / limit) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const MAX_MAP_CUSTOMERS = 2000;

// Customers' saved delivery addresses that fall inside the branch's delivery radius, for the map view
// Superadmin only
const getCustomerMap = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });

        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        const tenant = branch.tenantId
            ? await Tenant.findByPk(branch.tenantId, { attributes: ['googleMapsApiKey'] })
            : null;

        const lat = branch.latitude != null ? parseFloat(branch.latitude) : null;
        const lng = branch.longitude != null ? parseFloat(branch.longitude) : null;
        const radiusKm = branch.deliveryRadius != null ? parseFloat(branch.deliveryRadius) : null;

        const response = {
            mapsApiKey: tenant?.googleMapsApiKey || null,
            branch: { id: branch.id, name: branch.name, address: branch.address, latitude: lat, longitude: lng, deliveryRadius: radiusKm },
            customers: [],
            truncated: false
        };
        if (lat == null || lng == null || radiusKm == null) return res.json(response);

        // Cheap bounding-box prefilter in SQL, exact distance check below
        const dLat = radiusKm / 111;
        const dLng = radiusKm / (111 * Math.max(Math.cos(lat * Math.PI / 180), 0.01));
        const addresses = await CustomerAddress.findAll({
            where: {
                latitude: { [Op.between]: [lat - dLat, lat + dLat] },
                longitude: { [Op.between]: [lng - dLng, lng + dLng] }
            },
            include: [{ model: Customer, as: 'customer', where: { branchId: branch.id }, attributes: ['name', 'phone'], required: true }]
        });

        const points = [];
        for (const a of addresses) {
            const distanceKm = calculateDistance(lat, lng, parseFloat(a.latitude), parseFloat(a.longitude));
            if (distanceKm == null || distanceKm > radiusKm) continue;
            points.push({
                phone: a.customerPhone,
                name: a.customer?.name || null,
                label: a.label || null,
                address: a.formattedAddress || a.address || null,
                latitude: parseFloat(a.latitude),
                longitude: parseFloat(a.longitude),
                distanceKm: Math.round(distanceKm * 100) / 100
            });
        }
        points.sort((x, y) => x.distanceKm - y.distanceKm);
        if (points.length > MAX_MAP_CUSTOMERS) {
            points.length = MAX_MAP_CUSTOMERS;
            response.truncated = true;
        }

        const phones = [...new Set(points.map(p => p.phone))];
        const counts = phones.length
            ? await Order.findAll({
                where: { branchId: branch.id, customerPhone: { [Op.in]: phones }, status: { [Op.ne]: 'cancelled' } },
                attributes: ['customerPhone', [fn('COUNT', col('id')), 'orderCount']],
                group: ['customerPhone'],
                raw: true
            })
            : [];
        const orderCounts = Object.fromEntries(counts.map(c => [c.customerPhone, parseInt(c.orderCount, 10)]));
        response.customers = points.map(p => ({ ...p, orderCount: orderCounts[p.phone] || 0 }));

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranch,
    getBranchLogs,
    getCustomerMap
};