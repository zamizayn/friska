const { Category } = require('../models');

const getAllCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Category.findAndCountAll({
            where: await req.getScope(),
            limit,
            offset,
            order: [['name', 'ASC']]
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

const createCategory = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.user.role === 'branch') data.branchId = req.user.branchId;
        const item = await Category.create(data);
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const item = await Category.findByPk(req.params.id);
        if (item) {
            await item.update(req.body);
            res.json(item);
        } else res.status(404).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const item = await Category.findByPk(req.params.id);
        if (item) {
            await item.destroy();
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
