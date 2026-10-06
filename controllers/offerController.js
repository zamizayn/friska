const { Offer, Customer, Branch } = require('../models');
const { sendTemplateMessage } = require('../services/whatsappService');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { Op } = require('sequelize');

exports.getOffers = async (req, res) => {
    try {
        const where = await req.getScope();

        const offers = await Offer.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createOffer = async (req, res) => {
    try {
        const offer = await Offer.create(req.body);
        res.status(201).json(offer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Offer.update(req.body, { where: { id } });
        if (updated) {
            const updatedOffer = await Offer.findByPk(id);
            return res.json(updatedOffer);
        }
        res.status(404).json({ message: 'Offer not found' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Offer.destroy({ where: { id } });
        if (deleted) {
            return res.status(204).send();
        }
        res.status(404).json({ message: 'Offer not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.broadcastOffer = async (req, res) => {
    try {
        const { templateName, phones, headerImage, bodyParams } = req.body;
        if (!templateName || !Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'templateName and phones array are required' });
        }

        if (Array.isArray(bodyParams) && bodyParams.some(val => !val || String(val).trim() === '')) {
            return res.status(400).json({ error: 'All message template parameters must have non-empty text values' });
        }

        if (templateName.includes('image') && !headerImage) {
            return res.status(400).json({ error: 'headerImage is required for image templates' });
        }

        // Tenant and branch logins always send through their own tenant's WhatsApp account.
        // Only a superadmin may pick a branch (and so a tenant) through the request body.
        let tenantId = req.user?.tenantId;
        if (req.user?.role === 'superadmin' && req.body.branchId) {
            const branch = await Branch.findByPk(req.body.branchId).catch(() => null);
            tenantId = branch?.tenantId || tenantId;
        }
        const config = await getTenantConfig(tenantId);

        // Dedupe recipients so a single request can never message the same number twice.
        // Key is the last 10 digits so "+9197012738756" and "7012738756" collapse to one entry.
        const seenPhones = new Set();
        const uniquePhones = [];
        for (const p of phones) {
            const raw = String(p).trim();
            if (!raw) continue;
            const digits = raw.replace(/\D/g, '');
            const key = digits.length > 0 ? digits.slice(-10) : raw;
            if (seenPhones.has(key)) continue;
            seenPhones.add(key);
            uniquePhones.push(raw);
        }
        const duplicatesRemoved = phones.length - uniquePhones.length;

        // Fetch matching customer names in bulk to avoid querying in a loop
        const cleanPhones = uniquePhones.map(p => p.replace(/\D/g, '').slice(-10));
        const customers = await Customer.findAll({
            where: {
                phone: {
                    [Op.or]: cleanPhones.map(cp => ({ [Op.like]: `%${cp}` }))
                }
            }
        }).catch(() => []);

        const customerMap = {};
        for (const customer of customers) {
            const cp = customer.phone.replace(/\D/g, '').slice(-10);
            customerMap[cp] = customer.name;
        }

        const results = [];
        for (const phone of uniquePhones) {
            try {
                const cp = phone.replace(/\D/g, '').slice(-10);
                const nameToUse = customerMap[cp] || bodyParams[0] || 'Customer';

                const personalizedParams = [...bodyParams];
                personalizedParams[0] = nameToUse;

                await sendTemplateMessage(phone, templateName, personalizedParams, config, headerImage || null);
                results.push({ phone, status: 'sent', customerName: nameToUse });
            } catch (e) {
                results.push({ phone, status: 'failed', error: e.message });
            }
        }

        res.json({ sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'failed').length, duplicatesRemoved, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }
        const url = `${req.protocol}://${req.get('host')}/uploads/offers/${req.file.filename}`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
