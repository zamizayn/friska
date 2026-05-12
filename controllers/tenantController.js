const { Tenant } = require('../models');
const axios = require('axios');

const getMyTenant = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(404).json({ error: 'Tenant context not found' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllTenants = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
        const tenants = await Tenant.findAll({ order: [['name', 'ASC']] });
        res.json(tenants);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createTenant = async (req, res) => {
    try {
        const tenant = await Tenant.create(req.body);
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateTenant = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.params.id);
        if (tenant) {
            if (req.user.role === 'tenant' && req.user.tenantId != req.params.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await tenant.update(req.body);
            res.json(tenant);
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

const deleteTenant = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.params.id);
        if (tenant) {
            await tenant.destroy();
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const enableWebhooks = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });

        const tenantId = req.user.role === 'tenant' ? req.user.tenantId : req.params.id;

        if (!tenantId || tenantId === 'null') {
            return res.status(400).json({ error: 'Missing or invalid Tenant ID' });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const wabaId = req.body.wabaId || tenant.wabaId;
        const whatsappToken = req.body.whatsappToken || tenant.whatsappToken;

        if (!wabaId || !whatsappToken) {
            return res.status(400).json({ error: 'Missing WABA ID or Access Token' });
        }

        const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;

        try {
            await axios.post(url, {}, {
                headers: {
                    'Authorization': `Bearer ${whatsappToken}`
                }
            });

            tenant.webhooksEnabled = true;
            await tenant.save();

            res.json({ success: true, message: 'Webhooks enabled and subscribed on Meta' });
        } catch (metaError) {
            console.error('Meta API Error:', metaError.response?.data || metaError.message);
            res.status(500).json({
                error: 'Failed to subscribe on Meta',
                details: metaError.response?.data || metaError.message
            });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId, {
            attributes: ['razorpayKeyId', 'razorpayKeySecret', 'razorpayWebhookSecret', 'googleMapsApiKey']
        });
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (tenant) {
            const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret, googleMapsApiKey } = req.body;
            await tenant.update({ razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret, googleMapsApiKey });
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

const getWhatsAppSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId, {
            attributes: ['whatsappSettings']
        });
        res.json(tenant.whatsappSettings || {});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateWhatsAppSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (tenant) {
            await tenant.update({ whatsappSettings: req.body });
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

module.exports = {
    getMyTenant,
    getAllTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    enableWebhooks,
    getSettings,
    updateSettings,
    getWhatsAppSettings,
    updateWhatsAppSettings
};
