const { Order, Product, Tenant, Branch, CustomerLog, Category } = require('../models');
const { Op, fn, col } = require('sequelize');

const getDashboardAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, section = 'all' } = req.query;
        console.log('--- Dashboard Analytics Request ---');
        console.log('Query Params:', { startDate, endDate, section });

        const dateFilter = {};
        let hasDateFilter = false;
        if (startDate) {
            dateFilter[Op.gte] = `${startDate}T00:00:00.000Z`;
            hasDateFilter = true;
        }
        if (endDate) {
            dateFilter[Op.lte] = `${endDate}T23:59:59.999Z`;
            hasDateFilter = true;
        }

        const scopedWhere = await req.getScope(hasDateFilter ? { createdAt: dateFilter } : {});
        console.log('Generated Where Clause:', JSON.stringify(scopedWhere, null, 2));

        const response = {};

        const shouldInclude = (s) => section === 'all' || section === s;

        // Stats Section: Revenue, Orders, Customers, AOV
        if (shouldInclude('stats')) {
            const [totalOrders, statsRows, totalCustomers] = await Promise.all([
                Order.count({ where: scopedWhere }),
                Order.findAll({
                    where: scopedWhere,
                    attributes: [
                        [fn('SUM', col('total')), 'revenue'],
                        [fn('AVG', col('total')), 'aov']
                    ],
                    raw: true
                }),
                Order.count({
                    where: scopedWhere,
                    distinct: true,
                    col: 'customerPhone'
                })
            ]);

            response.totalOrders = totalOrders;
            response.revenue = parseFloat(statsRows[0]?.revenue || 0);
            response.aov = parseFloat(statsRows[0]?.aov || 0);
            response.totalCustomers = totalCustomers;
        }

        // Trend Section
        if (shouldInclude('trend')) {
            let trendWhere = scopedWhere;
            let truncateUnit = 'day';

            if (!startDate && !endDate) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                trendWhere = await req.getScope({ createdAt: { [Op.gte]: sevenDaysAgo } });
            } else if (startDate && endDate) {
                const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
                if (diffDays > 31) truncateUnit = 'month';
            }

            const trend = await Order.findAll({
                where: trendWhere,
                attributes: [
                    [fn('date_trunc', truncateUnit, col('createdAt')), 'date'],
                    [fn('SUM', col('total')), 'dailyRevenue'],
                    [fn('COUNT', col('id')), 'dailyOrders']
                ],
                group: [fn('date_trunc', truncateUnit, col('createdAt'))],
                order: [[fn('date_trunc', truncateUnit, col('createdAt')), 'ASC']],
                raw: true
            });
            response.trend = trend.map(t => ({
                date: new Date(t.date).toLocaleDateString('en-US', truncateUnit === 'month' ? { month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric' }),
                revenue: parseFloat(t.dailyRevenue),
                orders: parseInt(t.dailyOrders)
            }));
        }

        // Top Products Section
        if (shouldInclude('products')) {
            const allOrders = await Order.findAll({
                where: scopedWhere,
                attributes: ['items'],
                raw: true
            });
            const productCounts = {};
            allOrders.forEach(o => {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                items.forEach(it => {
                    const name = it.name || 'Unknown';
                    productCounts[name] = (productCounts[name] || 0) + (it.quantity || 1);
                });
            });
            response.topProducts = Object.entries(productCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));
        }

        // Category Revenue Section
        if (shouldInclude('categories')) {
            const categoryRevenue = {};
            const ordersForCat = await Order.findAll({
                where: scopedWhere,
                attributes: ['items', 'total'],
                raw: true
            });
            ordersForCat.forEach(o => {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                items.forEach(it => {
                    const catName = it.categoryName || 'General';
                    categoryRevenue[catName] = (categoryRevenue[catName] || 0) + (parseFloat(it.price || 0) * (it.quantity || 1));
                });
            });
            response.categoryRevenue = Object.entries(categoryRevenue).map(([name, value]) => ({ name, value }));
        }

        // Recent Orders Section
        if (shouldInclude('recent_orders')) {
            response.recentOrders = await Order.findAll({
                where: scopedWhere,
                limit: 5,
                order: [['createdAt', 'DESC']],
                raw: true
            });
        }

        // Status Counts Section
        if (shouldInclude('status_counts')) {
            const statusCounts = await Order.findAll({
                where: scopedWhere,
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'],
                raw: true
            });
            response.statusCounts = statusCounts.reduce((acc, curr) => {
                acc[curr.status] = parseInt(curr.count);
                return acc;
            }, { pending: 0, shipped: 0, delivered: 0 });
        }

        // Activity Feed Section
        if (shouldInclude('activity')) {
            const recentLogs = await CustomerLog.findAll({
                where: scopedWhere,
                limit: 8,
                order: [['createdAt', 'DESC']],
                raw: true
            });
            response.recentActivity = await Promise.all(recentLogs.map(async (log) => {
                const data = { ...log };
                if (data.actionType === 'PRODUCT_VIEWED' && data.details?.productId) {
                    const prod = await Product.findByPk(data.details.productId, { attributes: ['name'] });
                    if (prod) data.details.productName = prod.name;
                } else if (data.actionType === 'CATEGORY_VIEWED' && data.details?.categoryId) {
                    const cat = await Category.findByPk(data.details.categoryId, { attributes: ['name'] });
                    if (cat) data.details.categoryName = cat.name;
                }
                return data;
            }));
            response.pendingSupport = await CustomerLog.count({
                where: await req.getScope({ actionType: 'SUPPORT_REQUEST' })
            });
        }

        // Non-filtered Metadata (always include if 'all')
        if (section === 'all') {
            response.lowStock = await Product.findAll({
                where: await req.getScope({ stock: { [Op.lte]: 10 } }),
                attributes: ['id', 'name', 'stock'],
                raw: true
            });
            let webhooksEnabled = false;
            if (req.user.tenantId) {
                const tenant = await Tenant.findByPk(req.user.tenantId);
                webhooksEnabled = tenant?.webhooksEnabled || false;
            }
            response.webhooksEnabled = webhooksEnabled;
        }

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getProductSales = async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;
        const where = await req.getScope();

        const productWhere = { ...where };
        if (branchId) productWhere.branchId = branchId;
        const allProducts = await Product.findAll({
            where: productWhere,
            attributes: ['id', 'name', 'price'],
            raw: true
        });

        const orderWhere = { ...where };
        orderWhere.status = { [Op.ne]: 'cancelled' };
        if (branchId) orderWhere.branchId = branchId;
        if (startDate || endDate) {
            orderWhere.createdAt = {};
            if (startDate) orderWhere.createdAt[Op.gte] = new Date(startDate);
            if (endDate) orderWhere.createdAt[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const orders = await Order.findAll({
            where: orderWhere,
            attributes: ['items'],
            raw: true
        });

        const salesMap = {};
        orders.forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const id = item.id;
                    if (id) {
                        if (!salesMap[id]) salesMap[id] = { totalQuantity: 0, totalRevenue: 0 };
                        salesMap[id].totalQuantity += (item.quantity || 0);
                        salesMap[id].totalRevenue += (item.quantity || 0) * (item.price || 0);
                    }
                });
            }
        });

        const result = allProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            totalQuantity: salesMap[p.id]?.totalQuantity || 0,
            totalRevenue: salesMap[p.id]?.totalRevenue || 0
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getDashboardAnalytics,
    getProductSales
};
