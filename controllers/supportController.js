const { CustomerLog, Customer, Sequelize } = require('../models');
const { Op, fn, col } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const getSupportRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { unreadOnly, date } = req.query;
        let where = await req.getScope({ actionType: 'SUPPORT_REQUEST' });

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

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

const getMediaProxy = async (req, res) => {
    try {
        const { mediaId } = req.params;
        const tenantId = req.user.tenantId;
        const config = await getTenantConfig(tenantId);

        if (!config.whatsappToken) {
            return res.status(400).json({ error: 'WhatsApp configuration missing for this tenant' });
        }

        const { getMediaUrl } = require('../services/whatsappService');
        const mediaUrl = await getMediaUrl(mediaId, config);

        if (!mediaUrl) return res.status(404).json({ error: 'Media URL not found' });

        const axios = require('axios');
        const response = await axios.get(mediaUrl, {
            headers: { 'Authorization': `Bearer ${config.whatsappToken}` },
            responseType: 'stream'
        });

        // WhatsApp voice notes are OGG/Opus. 
        // Meta often misidentifies them as audio/mpeg or application/octet-stream, 
        // which causes NotSupportedError in browsers.
        res.set('Content-Type', 'audio/ogg');
        response.data.pipe(res);
    } catch (e) {
        console.error('Media Proxy Error:', e.message);
        res.status(500).json({ error: 'Failed to stream media' });
    }
};

module.exports = {
    getSupportRequests,
    replyToSupportRequest,
    getMediaProxy
};
