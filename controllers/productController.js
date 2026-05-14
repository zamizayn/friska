const { Product, Category, Branch } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { syncProductToMeta } = require('../services/whatsappService');
const fs = require('fs');
const csv = require('csv-parser');
const { cloudinary } = require('../services/cloudinaryService');

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

const bulkUploadProducts = async (req, res) => {
    const csvFile = req.files?.file?.[0];
    const imageFiles = req.files?.images || [];

    if (!csvFile) return res.status(400).json({ error: 'No CSV file uploaded' });

    const products = [];
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const branchId = req.body.branchId || (req.user.role === 'branch' ? req.user.branchId : null);
    if (!branchId && req.user.role !== 'superadmin') {
        return res.status(400).json({ error: 'Branch ID is required' });
    }

    // 1. Upload images to Cloudinary and create a mapping
    const imageMap = {};
    for (const file of imageFiles) {
        try {
            const uploadRes = await cloudinary.uploader.upload(file.path, {
                folder: 'friska_products'
            });
            imageMap[file.originalname] = uploadRes.secure_url;
            fs.unlinkSync(file.path); // Cleanup local file
        } catch (uploadError) {
            console.error(`Failed to upload ${file.originalname} to Cloudinary:`, uploadError.message);
        }
    }

    // 2. Parse CSV and create products
    fs.createReadStream(csvFile.path)
        .pipe(csv())
        .on('data', (data) => products.push(data))
        .on('end', async () => {
            const tenantId = req.user.tenantId;
            const config = await getTenantConfig(tenantId);

            for (const p of products) {
                try {
                    // Match image from map if image_file is provided, otherwise fallback to image URL column
                    const imageUrl = imageMap[p.image_file] || p.image || '';

                    const productData = {
                        name: p.name,
                        price: parseFloat(p.price),
                        description: p.description || '',
                        stock: parseInt(p.stock) || 0,
                        categoryId: parseInt(p.categoryId) || null,
                        retailerId: p.retailerId || `wstore_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        priority: parseInt(p.priority) || 0,
                        branchId: branchId || p.branchId,
                        image: imageUrl
                    };

                    if (!productData.name || isNaN(productData.price)) {
                        throw new Error(`Invalid name or price for product: ${p.name}`);
                    }

                    const item = await Product.create(productData);

                    // Sync to Meta if config exists
                    if (config && config.catalogId) {
                        try {
                            await syncProductToMeta(item, config);
                        } catch (syncError) {
                            console.error(`Meta sync failed for bulk item ${item.name}:`, syncError.message);
                        }
                    }

                    results.success++;
                } catch (e) {
                    results.failed++;
                    results.errors.push({ name: p.name, error: e.message });
                }
            }

            // Cleanup the CSV file
            fs.unlinkSync(csvFile.path);

            res.json(results);
        });
};

const getProductMetaStatusController = async (req, res) => {
    try {
        const item = await Product.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Product not found' });

        const tenantId = req.user.tenantId || (await Branch.findByPk(item.branchId))?.tenantId;
        const config = await getTenantConfig(tenantId);
        
        if (!config.catalogId) {
            return res.status(400).json({ error: 'Meta Catalog not configured for this tenant' });
        }

        const { getProductMetaStatus } = require('../services/whatsappService');
        const status = await getProductMetaStatus(item.retailerId, config);
        
        res.json(status || { message: 'Product not found in Meta Catalog' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getAllProducts,
    getBasicProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUploadProducts,
    getProductMetaStatusController
};
