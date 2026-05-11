const { Tenant, Branch, Product, Category } = require('../../models');

/**
 * Fetches the public catalog for a tenant by their username
 */
const getPublicCatalog = async (req, res) => {
    try {
        const { username } = req.params;

        // 1. Fetch Tenant
        const tenant = await Tenant.findOne({
            where: { username, isActive: true },
            attributes: ['id', 'name', 'username', 'whatsappSettings']
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // 2. Fetch all Branches for this tenant
        const branches = await Branch.findAll({
            where: { tenantId: tenant.id },
            attributes: ['id', 'name', 'openingTime', 'closingTime']
        });

        const branchIds = branches.map(b => b.id);

        // 3. Fetch Categories across all branches
        const categories = await Category.findAll({
            where: { branchId: branchIds },
            attributes: ['id', 'name', 'branchId'],
            order: [['name', 'ASC']]
        });

        // 4. Fetch Products across all branches
        const products = await Product.findAll({
            where: { branchId: branchIds },
            include: [{ 
                model: Category, 
                as: 'category', 
                attributes: ['name'] 
            }],
            order: [['priority', 'DESC'], ['name', 'ASC']]
        });

        // 5. Build response
        res.json({
            tenant: {
                name: tenant.name,
                username: tenant.username,
                branding: {
                    logo: tenant.whatsappSettings?.logo || null,
                    primaryColor: tenant.whatsappSettings?.primaryColor || '#000000'
                }
            },
            branches,
            categories,
            products
        });
    } catch (error) {
        console.error('Public Catalog Error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog' });
    }
};

module.exports = {
    getPublicCatalog
};
