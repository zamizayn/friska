const { Product, Category, Branch } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { syncProductToMeta } = require('../services/whatsappService');

const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search, categoryId, stockStatus, sortBy, sortOrder } = req.query;

        const where = await req.getScope();

        const order = [];
        if (sortBy === 'priority') {
            order.push(['priority', sortOrder === 'ASC' ? 'ASC' : 'DESC']);
        }
        order.push(['createdAt', 'DESC']);

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (stockStatus) {
            if (stockStatus === 'in_stock') {
                where.stock = { [Op.gt]: 10 };
            } else if (stockStatus === 'low_stock') {
                where.stock = { [Op.and]: [{ [Op.gt]: 0 }, { [Op.lte]: 10 }] };
            } else if (stockStatus === 'out_of_stock') {
                where.stock = 0;
            }
        }

        const { count, rows } = await Product.findAndCountAll({
            where,
            include: [{ model: Category, as: 'category' }],
            limit,
            offset,
            order
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

const getBasicProducts = async (req, res) => {
    try {
        const { search, categoryId } = req.query;
        const where = await req.getScope();

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }

        const products = await Product.findAll({
            where,
            attributes: ['id', 'name', 'price', 'stock'],
            order: [['name', 'ASC']],
            limit: 200
        });

        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createProduct = async (req, res) => {
    const data = { ...req.body };
    if (req.user.role === 'branch') data.branchId = req.user.branchId;

    if (req.file) {
        data.image = req.file.path;
    }

    if (data.price) data.price = parseFloat(data.price);
    if (data.stock) data.stock = parseInt(data.stock);
    if (data.priority !== undefined) data.priority = parseInt(data.priority) || 0;

    if (!data.retailerId) {
        data.retailerId = `wstore_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    try {
        const item = await Product.create(data);

        // Auto-sync to Meta Catalog
        try {
            const tenantId = req.user.tenantId || (await Branch.findByPk(item.branchId))?.tenantId;
            const config = await getTenantConfig(tenantId);
            if (config.catalogId) {
                await syncProductToMeta(item, config);
            }
        } catch (syncError) {
            console.error("Meta auto-sync failed:", syncError.message);
        }

        res.json(item);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const item = await Product.findByPk(req.params.id);
        if (!item) return res.status(404).send();

        const data = { ...req.body };
        if (req.file) {
            data.image = req.file.path;
        }

        if (data.price) data.price = parseFloat(data.price);
        if (data.stock !== undefined) data.stock = parseInt(data.stock);

        if (data.priority !== undefined) {
            const newPriority = parseInt(data.priority) || 0;
            const oldPriority = item.priority || 0;

            if (newPriority !== oldPriority) {
                const scopeWhere = await req.getScope();
                // Shift priorities to accommodate the new position
                if (newPriority < oldPriority) {
                    // Moving UP (e.g. from 5 to 2) -> Increment everything between 2 and 4
                    await Product.increment('priority', {
                        where: {
                            ...scopeWhere,
                            priority: { [Op.between]: [newPriority, oldPriority - 1] },
                            id: { [Op.ne]: item.id }
                        }
                    });
                } else {
                    // Moving DOWN (e.g. from 2 to 5) -> Decrement everything between 3 and 5
                    await Product.decrement('priority', {
                        where: {
                            ...scopeWhere,
                            priority: { [Op.between]: [oldPriority + 1, newPriority] },
                            id: { [Op.ne]: item.id }
                        }
                    });
                }
            }
            data.priority = newPriority;
        }

        await item.update(data);

        // Auto-sync update to Meta Catalog
        try {
            const tenantId = req.user.tenantId || (await Branch.findByPk(item.branchId))?.tenantId;
            const config = await getTenantConfig(tenantId);
            if (config.catalogId) {
                await syncProductToMeta(item, config);
            }
        } catch (syncError) {
            console.error("Meta auto-sync failed (update):", syncError.message);
        }

        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const item = await Product.findByPk(req.params.id);
        if (!item) return res.status(404).send();

        await item.destroy();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getAllProducts,
    getBasicProducts,
    createProduct,
    updateProduct,
    deleteProduct
};
