const { FcmToken, Notification } = require('../models');

const registerFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const adminId = req.user.branchId || req.user.tenantId || 0;
        const [fcm, created] = await FcmToken.findOrCreate({
            where: { token },
            defaults: {
                token,
                adminId,
                tenantId: req.user.tenantId || null,
                branchId: req.user.branchId || null,
                role: req.user.role
            }
        });

        if (!created) {
            await fcm.update({
                adminId,
                tenantId: req.user.tenantId || null,
                branchId: req.user.branchId || null,
                role: req.user.role
            });
        }

        res.json({ success: true, created });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const unregisterFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            await FcmToken.destroy({ where: { token } });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getNotificationHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const where = {};
        if (req.user.tenantId) {
            where.tenantId = req.user.tenantId;
        }

        const { count, rows } = await Notification.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        const unreadCount = await Notification.count({
            where: { ...where, isRead: false }
        });

        res.json({ 
            notifications: rows, 
            unreadCount,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const markNotificationsRead = async (req, res) => {
    try {
        const where = {};
        if (req.user.tenantId) {
            where.tenantId = req.user.tenantId;
        }
        await Notification.update({ isRead: true }, { where });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    registerFcmToken,
    unregisterFcmToken,
    getNotificationHistory,
    markNotificationsRead
};
