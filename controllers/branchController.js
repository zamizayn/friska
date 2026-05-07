const { Branch, Tenant } = require('../models');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

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
        if (!updateData.password) {
            delete updateData.password;
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

module.exports = {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch
};
