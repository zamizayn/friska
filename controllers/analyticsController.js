const { Order, Product, Tenant, Branch, CustomerLog, Category } = require('../models');
const { Op, fn, col } = require('sequelize');

const getDashboardAnalytics = async (req, res) => {
    try {
        const totalOrders = await Order.count({ where: await req.getScope() });
        const stats = await Order.findAll({
            where: await req.getScope(),
            attributes: [
                [fn('SUM', col('total')), 'revenue'],
                [fn('AVG', col('total')), 'aov']
            ],
            raw: true
        });

        const revenue = parseFloat(stats[0].revenue || 0);
        const aov = parseFloat(stats[0].aov || 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trend = await Order.findAll({
            where: await req.getScope({ createdAt: { [Op.gte]: sevenDaysAgo } }),
            attributes: [
                [fn('date_trunc', 'day', col('createdAt')), 'date'],
                [fn('SUM', col('total')), 'dailyRevenue'],
                [fn('COUNT', col('id')), 'dailyOrders']
            ],
            group: [fn('date_trunc', 'day', col('createdAt'))],
            order: [[fn('date_trunc', 'day', col('createdAt')), 'ASC']],
            raw: true
        });

        const allOrders = await Order.findAll({
            where: await req.getScope(),
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

        const topProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const lowStock = await Product.findAll({
            where: await req.getScope({ stock: { [Op.lte]: 10 } }),
            attributes: ['id', 'name', 'stock'],
            raw: true
        });

        const recentOrders = await Order.findAll({
            where: await req.getScope(),
            limit: 5,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const statusCounts = await Order.findAll({
            where: await req.getScope(),
            attributes: ['status', [fn('COUNT', col('id')), 'count']],
            group: ['status'],
            raw: true
        });

        const customerOrders = await Order.findAll({
            where: await req.getScope(),
            attributes: ['customerPhone', [fn('COUNT', col('id')), 'orderCount']],
            group: ['customerPhone'],
            raw: true
        });
        const totalCustomers = customerOrders.length;
        const repeatCustomers = customerOrders.filter(c => parseInt(c.orderCount) > 1).length;
        const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        const categoryRevenue = {};
        const ordersForCat = await Order.findAll({
            where: await req.getScope(),
            attributes: ['items', 'total'],
            raw: true
        });
        ordersForCat.forEach(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            items.forEach(it => {
                const catName = it.categoryName || 'General';
                categoryRevenue[catName] = (categoryRevenue[catName] || 0) + (it.price * it.quantity);
            });
        });

        const hourlyStats = await Order.findAll({
            where: await req.getScope(),
            attributes: [
                [fn('date_part', 'hour', col('createdAt')), 'hour'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: [fn('date_part', 'hour', col('createdAt'))],
            raw: true
        });

        let webhooksEnabled = false;
        if (req.user.tenantId) {
            const tenant = await Tenant.findByPk(req.user.tenantId);
            webhooksEnabled = tenant?.webhooksEnabled || false;
        }

        // NEW: Fetch recent activity logs
        const recentLogs = await CustomerLog.findAll({
            where: await req.getScope(),
            limit: 8,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const enrichedLogs = await Promise.all(recentLogs.map(async (log) => {
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

        const pendingSupport = await CustomerLog.count({
            where: await req.getScope({ actionType: 'SUPPORT_REQUEST' })
        });

        res.json({
            revenue,
            webhooksEnabled,
            aov,
            totalOrders,
            totalCustomers,
            pendingSupport,
            retentionRate: Math.round(retentionRate),
            clv: totalCustomers > 0 ? (revenue / totalCustomers) : 0,
            categoryRevenue: Object.entries(categoryRevenue).map(([name, value]) => ({ name, value })),
            hourlyStats: hourlyStats.map(h => ({ hour: `${h.hour}:00`, count: parseInt(h.count) })),
            trend: trend.map(t => ({
                date: new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: parseFloat(t.dailyRevenue),
                orders: parseInt(t.dailyOrders)
            })),
            topProducts,
            recentOrders,
            lowStock,
            recentActivity: enrichedLogs,
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = parseInt(curr.count);
                return acc;
            }, { pending: 0, shipped: 0, delivered: 0 })
        });
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
