const { Banner } = require('../models');

exports.getBanners = async (req, res) => {
    try {
        const where = await req.getScope();
        const banners = await Banner.findAll({
            where,
            order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
        });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createBanner = async (req, res) => {
    try {
        const banner = await Banner.create(req.body);
        res.status(201).json(banner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Banner.update(req.body, { where: { id } });
        if (updated) {
            const updatedBanner = await Banner.findByPk(id);
            return res.json(updatedBanner);
        }
        res.status(404).json({ message: 'Banner not found' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Banner.destroy({ where: { id } });
        if (deleted) {
            return res.status(204).send();
        }
        res.status(404).json({ message: 'Banner not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }
        const url = `${req.protocol}://${req.get('host')}/uploads/banners/${req.file.filename}`;
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};