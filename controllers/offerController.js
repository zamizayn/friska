const { Offer } = require('../models');

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
