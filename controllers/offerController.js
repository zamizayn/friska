const { Offer, Customer, Branch } = require('../models');
const { sendTemplateMessage } = require('../services/whatsappService');
const { getTenantConfig } = require('../utils/tenantHelpers');

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

        const branch = await Branch.findByPk(req.body.branchId || req.branchId).catch(() => null);
        const tenantId = branch?.tenantId || req.tenantId;
        const config = await getTenantConfig(tenantId);

        const results = [];
        for (const phone of phones) {
            try {
                await sendTemplateMessage(phone, templateName, bodyParams || [], config, headerImage || null);
                results.push({ phone, status: 'sent' });
            } catch (e) {
                results.push({ phone, status: 'failed', error: e.message });
            }
        }

        res.json({ sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'failed').length, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }
        const url = `/uploads/offers/${req.file.filename}`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
