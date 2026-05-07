const jwt = require('jsonwebtoken');
const { Branch, Tenant } = require('../models');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wstore';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;

        // Helper to get scoping where clause
        req.getScope = async (existingWhere = {}) => {
            if (req.user.role === 'superadmin') {
                if (req.query.tenantId) {
                    const branches = await Branch.findAll({
                        where: { tenantId: req.query.tenantId },
                        attributes: ['id']
                    });
                    const branchIds = branches.map(b => b.id);
                    return { ...existingWhere, branchId: { [Op.in]: branchIds } };
                }
                return existingWhere;
            }

            if (req.user.role === 'tenant') {
                // If a specific branch is requested via query, and it belongs to this tenant, use it
                if (req.query.branchId) {
                    const branch = await Branch.findOne({ where: { id: req.query.branchId, tenantId: req.user.tenantId } });
                    if (branch) return { ...existingWhere, branchId: branch.id };
                }

                // Default: Fetch all branch IDs for this tenant
                const branches = await Branch.findAll({
                    where: { tenantId: req.user.tenantId },
                    attributes: ['id']
                });
                const branchIds = branches.map(b => b.id);
                return { ...existingWhere, branchId: { [Op.in]: branchIds } };
            }

            // If branch admin, scope by branchId OR null (for general tenant logs)
            return { ...existingWhere, branchId: { [Op.or]: [req.user.branchId, null] } };
        };

        next();
    });
};

module.exports = { authenticateToken, JWT_SECRET };
