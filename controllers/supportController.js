const { CustomerLog, Customer, Sequelize } = require('../models');
const { Op, fn, col } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const getSupportRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { unreadOnly } = req.query;

        let where = await req.getScope({ actionType: 'SUPPORT_REQUEST' });

        if (unreadOnly === 'true') {
            where[Op.and] = [
                Sequelize.literal(`NOT EXISTS (
                    SELECT 1 FROM "CustomerLogs" AS "reply" 
                    WHERE "reply"."actionType" = 'SUPPORT_REPLY' 
                    AND ("reply"."details"->>'originalRequestId')::int = "CustomerLog"."id"
                )`)
            ];
        }

        const { count, rows } = await CustomerLog.findAndCountAll({
            where,
            include: [{
                model: Customer,
                as: 'customer',
                attributes: ['phone', 'name']
            }],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
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

const replyToSupportRequest = async (req, res) => {
    try {
        const { replyMessage } = req.body;
        if (!replyMessage) return res.status(400).json({ error: 'Reply message is required' });

        const log = await CustomerLog.findByPk(req.params.id);
        if (!log) return res.status(404).json({ error: 'Support request not found' });

        const tenantId = req.user.tenantId || log.tenantId;
        const config = await getTenantConfig(tenantId);

        await sendTextMessage(log.customerPhone, `🆘 *Support Reply*\n\n${replyMessage}`, config);

        await CustomerLog.create({
            customerPhone: log.customerPhone,
            actionType: 'SUPPORT_REPLY',
            details: { reply: replyMessage, originalRequestId: log.id },
            branchId: log.branchId
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getSupportRequests,
    replyToSupportRequest
};
