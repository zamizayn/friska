const jwt = require('jsonwebtoken');
const { Admin, Branch, Tenant } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check Superadmin
        const admin = await Admin.findOne({ where: { username, password } });
        if (admin) {
            const token = jwt.sign({ username, role: 'superadmin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'superadmin' });
        }

        // 2. Check Branch Admin
        const branch = await Branch.findOne({ 
            where: { username, password },
            include: [{ model: Tenant }]
        });
        if (branch) {
            const token = jwt.sign({
                username,
                role: 'branch',
                branchId: branch.id,
                tenantId: branch.tenantId,
                branchName: branch.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ 
                token, 
                role: 'branch', 
                branchId: branch.id, 
                tenantId: branch.tenantId, 
                tenantName: branch.Tenant?.name || 'Store' 
            });
        }

        // 3. Check Tenant Admin
        const tenant = await Tenant.findOne({ where: { username, password, isActive: true } });
        if (tenant) {
            const token = jwt.sign({
                username,
                role: 'tenant',
                tenantId: tenant.id,
                tenantName: tenant.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'tenant', tenantId: tenant.id, tenantName: tenant.name });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { username, role, tenantId, branchId } = req.user;

    try {
        let user;
        if (role === 'superadmin') {
            user = await Admin.findOne({ where: { username, password: currentPassword } });
        } else if (role === 'tenant') {
            user = await Tenant.findOne({ where: { id: tenantId, password: currentPassword } });
        } else if (role === 'branch') {
            user = await Branch.findOne({ where: { id: branchId, password: currentPassword } });
        }

        if (!user) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        return res.json({ message: 'Password updated successfully' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

module.exports = { login, changePassword };
