const axios = require('axios');
const {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendProductCardMessage,
    sendSingleProductMessage,
    sendMultiProductMessage,
    sendCarouselMessage,
    sendLocationRequest,
    sendTypingIndicator
} = require('../services/whatsappService');

const {
    Category,
    Product,
    Order,
    Customer,
    Branch,
    Tenant,
    CustomerLog,
    Offer,
    CustomerAddress
} = require('../models');

const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');
const notificationService = require('../services/notificationService');
const orderService = require('../services/orderService');
const { createPaymentLink } = require('../services/paymentService');
const aiService = require('../services/aiService');

// sessions structure: { [phoneNumber]: { state: 'HOME', tenantId: 1, branchId: 1, config: { ... } } }
const sessions = {};
const carts = {};

const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === process.env.VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// =========================
// Helper Functions
// =========================

const isBranchOpen = (branch) => {
    if (!branch || !branch.openingTime || !branch.closingTime) return true;
    const now = moment().tz('Asia/Kolkata');
    const currentTime = now.format('HH:mm');
    return currentTime >= branch.openingTime && currentTime <= branch.closingTime;
};

const format12Hour = (timeStr) => {
    if (!timeStr) return '12:00 AM';
    return moment(timeStr, 'HH:mm').format('hh:mm A');
};

const logCustomerActivity = async (phone, tenantId, branchId, actionType, details = {}) => {
    try {
        await CustomerLog.create({
            customerPhone: phone,
            tenantId,
            branchId,
            actionType,
            details
        });
    } catch (e) {
        console.error('Failed to log customer activity:', e.message);
    }
};

const getTenantMessage = (tenant, key, defaultMsg, placeholders = {}) => {
    let msg = tenant.whatsappSettings?.[key] || defaultMsg;
    for (const [pKey, pValue] of Object.entries(placeholders)) {
        msg = msg.replace(new RegExp(`{{${pKey}}}`, 'g'), pValue || '');
    }
    return msg;
};

const extractTextFromMessage = (message) => {
    if (message.type === 'text') {
        return message.text?.body?.toLowerCase().trim() || '';
    } else if (message.type === 'interactive') {
        if (message.interactive?.button_reply) {
            return message.interactive.button_reply.id;
        } else if (message.interactive?.list_reply) {
            return message.interactive.list_reply.id;
        } else if (message.interactive?.nfm_reply) {
            // Carousel buttons often return the ID in nfm_reply.response_json
            try {
                const response = JSON.parse(message.interactive.nfm_reply.response_json);
                return response.id || '';
            } catch (e) {
                return '';
            }
        } else if (message.interactive?.action?.button_reply) {
            return message.interactive.action.button_reply.id;
        }
    } else if (message.type === 'button') {
        return message.button?.payload || '';
    } else if (message.type === 'location') {
        const loc = message.location;
        return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
    } else if (message.type === 'order') {
        return 'native_order';
    } else if (message.type === 'audio' || message.type === 'voice') {
        return `🎤 [Audio Message] (ID: ${message.audio?.id || message.voice?.id})`;
    }
    return '';
};
const getAddressFromCoords = async (lat, lng, apiKey) => {
    try {
        if (!apiKey) return null;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const res = await axios.get(url);
        console.log(`[Geocoding API] Status: ${res.data.status}, Results count: ${res.data.results?.length}`);
        if (res.data.status === 'OK' && res.data.results.length > 0) {
            return res.data.results[0].formatted_address;
        }
        if (res.data.status !== 'OK') {
            console.error(`[Geocoding API] Error Message: ${res.data.error_message || 'Unknown error'}`);
        }
        return null;
    } catch (e) {
        console.error('Reverse Geocoding Error:', e.message);
        return null;
    }
};

// =========================
// Handler Functions
// =========================

const handleHomeMenu = async (from, session, tenant, customer) => {
    session.state = 'START';
    session.categoryId = null;
    session.page = 1;

    const welcomeMsg = customer?.name
        ? getTenantMessage(tenant, 'welcomeReturning', `Welcome back to *{{tenant_name}}*, {{customer_name}}! 😊 We're so happy to see you again. Explore our latest collection and let us know if you need any help! 🛍️`, { tenant_name: tenant.name, customer_name: customer.name })
        : getTenantMessage(tenant, 'welcomeNew', `Welcome to *{{tenant_name}}*! 🛍️ We're excited to help you find precisely what you're looking for today. Feel free to browse our catalogs and reach out if you have any questions! ✨`, { tenant_name: tenant.name });

    // Try to show products if branch is assigned
    let productsShown = false;

    // If no branchId yet, try to pick the first one from the tenant just for the home menu products
    let queryBranchId = session.branchId;
    if (!queryBranchId) {
        const firstBranch = await Branch.findOne({ where: { tenantId: tenant.id } });
        if (firstBranch) queryBranchId = firstBranch.id;
    }

    if (queryBranchId) {
        try {
            const products = await Product.findAll({
                where: { branchId: queryBranchId },
                limit: 5,
                order: [['priority', 'ASC'], ['name', 'ASC']]
            });

            if (products.length > 0) {
                if (session.catalogId && session.config.displayMode !== 'carousel') {
                    // Native Catalog UI
                    const uniqueRetailerIds = new Set();
                    const productItems = [];
                    products.forEach(p => {
                        if (p.retailerId && !uniqueRetailerIds.has(p.retailerId)) {
                            uniqueRetailerIds.add(p.retailerId);
                            productItems.push({ product_retailer_id: p.retailerId });
                        }
                    });

                    if (productItems.length > 0) {
                        const sections = [{
                            title: 'Our Featured Collection',
                            product_items: productItems
                        }];
                        await sendMultiProductMessage(from, session.catalogId, `🛍️ ${tenant.name}`, welcomeMsg, sections, session.config);
                        productsShown = true;
                    }
                } else {
                    // Carousel Mode
                    if (products.length === 1) {
                        await sendProductCardMessage(from, products[0], session.config);
                        productsShown = true;
                    } else {
                        const carouselCards = products.map(p => ({
                            image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
                            title: p.name.slice(0, 32),
                            buttons: [
                                { id: `product_${p.id}`, title: 'View Details' },
                                { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
                            ]
                        }));

                        // Use welcomeMsg as the carousel body
                        await sendCarouselMessage(from, welcomeMsg.slice(0, 1024), carouselCards, session.config);
                        productsShown = true;
                    }
                }
            }
        } catch (e) {
            console.error('[HomeMenu] Error showing products:', e.response?.data || e.message);
        }
    }

    const menuBody = productsShown
        ? "Explore more options from our menu below: 🏠"
        : welcomeMsg;

    await sendListMessage(from, menuBody, "Main Menu", [
        {
            title: "🛒 Shopping",
            rows: [
                { id: 'shop', title: 'Browse Store', description: 'View categories & products' },
                { id: 'all_products', title: 'All Products', description: 'View all items directly' },
                { id: 'search_mode', title: 'Search Products', description: 'Find something specific 🔍' }
            ]
        },
        {
            title: "📋 Account",
            rows: [
                { id: 'cart', title: 'View Cart', description: 'Check your items 🛒' },
                { id: 'track', title: 'Track Order', description: 'Check status 🚚' }
            ]
        },
        {
            title: "🆘 Help & Support",
            rows: [
                { id: 'support', title: 'Get Help', description: 'Chat with our support team' }
            ]
        }
    ], session.config);
};

const handleSupport = async (from, session, tenant) => {
    const msg = getTenantMessage(tenant, 'supportMessage', "🆘 *Help & Support*\n\nIs your issue related to a specific order?");
    await sendButtonMessage(from, msg, [
        { id: 'support_order_yes', title: 'Yes, Select Order' },
        { id: 'support_order_no', title: 'No, Other Issue' }
    ], session.config);
};

const handleSupportOrderList = async (from, session) => {
    const recentOrders = await Order.findAll({
        where: { customerPhone: from },
        order: [['createdAt', 'DESC']],
        limit: 5
    });

    if (recentOrders.length === 0) {
        await sendTextMessage(from, "No recent orders found. Please describe your issue below:", session.config);
        session.state = 'SUPPORT';
        session.supportOrderId = null;
        return;
    }

    const rows = recentOrders.map(order => {
        const statusEmoji = { 'pending': '⏳', 'shipped': '🚚', 'delivered': '✅', 'cancelled': '❌' }[order.status] || '📦';
        return {
            id: `support_order_${order.id}`,
            title: `Order #${order.id} ${statusEmoji}`,
            description: `₹${order.total} • ${new Date(order.createdAt).toLocaleDateString()}`
        };
    });

    await sendListMessage(
        from,
        "Please select the order you need help with:",
        "Select Order",
        [{ title: "Recent Orders", rows }],
        session.config
    );
};

const handleTrackOrder = async (from, session) => {
    const recentOrders = await Order.findAll({
        where: { customerPhone: from },
        order: [['createdAt', 'DESC']],
        limit: 5
    });

    if (recentOrders.length === 0) {
        return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️", [{ id: 'shop', title: 'Shop Now' }], session.config);
    }

    if (recentOrders.length === 1) {
        // Only one order, show it directly
        return await handleViewOrder(from, `view_order_${recentOrders[0].id}`, session);
    }

    // Multiple orders, show a list
    const rows = recentOrders.map(order => {
        const statusEmoji = { 'pending': '⏳', 'shipped': '🚚', 'delivered': '✅', 'cancelled': '❌' }[order.status] || '📦';
        return {
            id: `view_order_${order.id}`,
            title: `Order #${order.id} ${statusEmoji}`,
            description: `₹${order.total} • ${new Date(order.createdAt).toLocaleDateString()}`
        };
    });

    await sendListMessage(
        from,
        "Here are your most recent orders. Select an order to view its details :",
        "Select Order",
        [{ title: "Recent Orders", rows }],
        session.config
    );
};

const handleViewOrder = async (from, text, session) => {
    const orderId = text.replace('view_order_', '');
    const order = await Order.findByPk(orderId);

    if (!order || order.customerPhone !== from) {
        return await sendTextMessage(from, "❌ Order not found.", session.config);
    }

    const statusEmoji = {
        'pending': '⏳',
        'shipped': '🚚',
        'delivered': '✅',
        'cancelled': '❌'
    }[order.status] || '📦';

    const trackingText = `📑 *Order Status*\nOrder #${order.id}\nStatus: ${order.status.toUpperCase()} ${statusEmoji}\nTotal: ₹${order.total}\nPlaced on: ${new Date(order.createdAt).toLocaleDateString()}`;

    const buttons = [{ id: 'menu', title: 'Back to Menu' }];
    if (order.status === 'delivered') {
        buttons.push({ id: `rate_${order.id}`, title: 'Rate Order ⭐' });
    } else {
        buttons.push({ id: 'shop', title: 'Shop More' });
    }

    // Cancellation logic: within 5 minutes and pending state
    const fiveMinutes = 5 * 60 * 1000;
    const isWithinFiveMinutes = (new Date() - new Date(order.createdAt)) <= fiveMinutes;

    if (order.status === 'pending' && isWithinFiveMinutes) {
        buttons.push({ id: `cancel_order_${order.id}`, title: 'Cancel Order ❌' });
    }

    await sendButtonMessage(from, trackingText, buttons, session.config);
};

const handleCancelOrder = async (from, text, session) => {
    const orderId = text.replace('cancel_order_', '');
    const order = await Order.findByPk(orderId);

    if (!order) {
        return await sendTextMessage(from, "❌ Order not found.", session.config);
    }

    if (order.customerPhone !== from) {
        return await sendTextMessage(from, "❌ Unauthorized request.", session.config);
    }

    const fiveMinutes = 5 * 60 * 1000;
    const isWithinFiveMinutes = (new Date() - new Date(order.createdAt)) <= fiveMinutes;

    if (order.status !== 'pending' || !isWithinFiveMinutes) {
        return await sendButtonMessage(
            from,
            "❌ Order cannot be cancelled anymore. The cancellation window has passed or the order is already being processed.",
            [{ id: 'track', title: 'Track Order' }],
            session.config
        );
    }

    order.status = 'cancelled';
    await order.save();

    // Optionally restock the items
    if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
            try {
                await Product.increment('stock', { by: item.quantity, where: { id: item.id } });
            } catch (e) {
                console.error(`Restock error for ${item.name}:`, e.message);
            }
        }
    }

    await sendButtonMessage(
        from,
        `✅ Your order #${order.id} has been successfully cancelled.`,
        [{ id: 'shop', title: 'Shop Now' }],
        session.config
    );
};

const handleSearchMode = async (from, session, tenant) => {
    session.state = 'SEARCHING';
    const msg = getTenantMessage(tenant, 'searchProductsMessage', "🔍 *Product Search*\n\nType the name of the product you are looking for:");
    await sendTextMessage(from, msg, session.config);
};

const handleSearching = async (from, text, session) => {
    if (text === 'menu' || text === 'shop') {
        session.state = 'START';
        return 'RE_ROUTE';
    }

    session.state = 'SEARCHING';
    session.searchQuery = text; // Store for pagination

    const page = session.page || 1;
    const limit = 10;

    const { count, rows: searchResults } = await Product.findAndCountAll({
        where: {
            [Op.and]: [
                {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${text}%` } },
                        { description: { [Op.iLike]: `%${text}%` } }
                    ]
                },
                { branchId: session.branchId || { [Op.not]: null } }
            ]
        },
        order: [['priority', 'ASC'], ['name', 'ASC']],
        limit,
        offset: (page - 1) * limit
    });

    if (count === 0) {
        return await sendButtonMessage(from, `❌ No products found matching "*${text}*". Try another name or browse our categories.`, [{ id: 'search_mode', title: 'Search Again' }, { id: 'shop', title: 'Browse Store' }], session.config);
    }

    if (session.catalogId && session.config.displayMode !== 'carousel') {
        const uniqueRetailerIds = new Set();
        const productItems = [];
        searchResults.forEach(p => {
            if (p.retailerId && !uniqueRetailerIds.has(p.retailerId)) {
                uniqueRetailerIds.add(p.retailerId);
                productItems.push({ product_retailer_id: p.retailerId });
            }
        });

        const sections = [{
            title: 'Search Results',
            product_items: productItems
        }];

        const optionRows = [];
        if (count > page * limit) {
            optionRows.push({ id: `search_page_${page + 1}`, title: 'Next Page ➡️', description: `View more results for "${text}"` });
        }
        if (page > 1) {
            optionRows.push({ id: `search_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });
        }
        optionRows.push({ id: 'search_mode', title: '🔍 Search Again', description: 'Try a different keyword' });
        if (productItems.length === 1) {
            await sendProductCardMessage(from, searchResults[0], session.config);
        } else {
            await sendMultiProductMessage(from, session.catalogId, `🔍 Search: "${text}" (Page ${page})`, `Found ${count} matches`, sections, session.config);
        }
        if (optionRows.length > 0) {
            await sendListMessage(from, "⚙️ *Search Options*", "Options", [{ title: "Options", rows: optionRows }], session.config);
        }
    } else {
        if (searchResults.length === 1) {
            await sendProductCardMessage(from, searchResults[0], session.config);
        } else {
            const carouselCards = searchResults.map(p => ({
                image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
                title: p.name.slice(0, 32),
                buttons: [
                    { id: `product_${p.id}`, title: 'View Details' },
                    { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
                ]
            }));
            await sendCarouselMessage(from, `🔍 Search results for "*${text}*"`, carouselCards, session.config);
        }
    }

    session.state = 'START';
};

const handleRating = async (from, text, session) => {
    const orderId = text.replace('rate_', '');
    session.state = 'COLLECTING_FEEDBACK';
    session.pendingOrderId = orderId;
    await sendButtonMessage(from, "How was your experience with this order? ⭐", [
        { id: 'star_5', title: 'Excellent ⭐⭐⭐⭐⭐' },
        { id: 'star_4', title: 'Good ⭐⭐⭐⭐' },
        { id: 'star_3', title: 'Average ⭐⭐⭐' }
    ], session.config);
};

const handleCollectingFeedback = async (from, text, session) => {
    const rating = text.replace('star_', '');
    await sendTextMessage(from, `Thank you for your ${rating}-star rating! 🙏 Your feedback helps us improve.`, session.config);
    session.state = 'START';
};

const handleChangeBranch = async (from, session, tenant) => {
    session.state = 'SELECTING_BRANCH';
    const branches = await Branch.findAll({
        where: { tenantId: session.tenantId },
        order: [['name', 'ASC']]
    });
    await sendListMessage(
        from,
        getTenantMessage(tenant, 'chooseBranchMessage', '📍 Choose your nearest branch'),
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(branch => ({
                id: `branch_${branch.id}`,
                title: branch.name.slice(0, 24),
                description: branch.address || 'Select branch'
            }))
        }],
        session.config
    );
};

const validateShopOpen = async (from, session) => {
    if (session.branchId) {
        const branch = await Branch.findByPk(session.branchId);
        if (branch && !isBranchOpen(branch)) {
            await sendTextMessage(from, `Hi! 👋 Our shop is currently closed. We are open from *${format12Hour(branch.openingTime)}* to *${format12Hour(branch.closingTime)}*. Please reach out during our working hours. Thank you!`, session.config);
            return false;
        }
    }
    return true;
};

const handleShop = async (from, text, session, tenant, customer) => {

    if (text === 'shop' || text === 'change_category') {
        session.categoryId = null;
        session.page = 1;
    }

    if (session.categoryId) {
        console.log(`[Shop] Category found in session: ${session.categoryId}`);
        const category = await Category.findByPk(session.categoryId);
        if (category) {
            const catProducts = await Product.findAll({
                where: { categoryId: category.id, branchId: session.branchId },
                order: [['name', 'ASC']]
            });

            if (session.catalogId) {
                const uniqueRetailerIds = new Set();
                const productItems = [];
                catProducts.forEach(p => {
                    if (p.retailerId && !uniqueRetailerIds.has(p.retailerId)) {
                        uniqueRetailerIds.add(p.retailerId);
                        productItems.push({ product_retailer_id: p.retailerId });
                    }
                });

                const sections = [{
                    title: category.name.slice(0, 24),
                    product_items: productItems
                }];
                return await sendMultiProductMessage(from, session.catalogId, `🛍️ ${category.name} Collection`, 'Choose a product below', sections, session.config);
            } else {
                if (catProducts.length === 1) {
                    await sendProductCardMessage(from, catProducts[0], session.config);
                } else {
                    const carouselCards = catProducts.map(p => ({
                        image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
                        title: p.name.slice(0, 32),
                        buttons: [
                            { id: `product_${p.id}`, title: 'View Details' },
                            { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
                        ]
                    }));

                    await sendCarouselMessage(from, `🛍️ *${category.name}*`, carouselCards, session.config);
                }
            }
            return;
        }
    }

    if (customer?.branchId) {
        console.log(`[Shop] Branch found in customer record: ${customer.branchId}`);
        const branch = await Branch.findByPk(customer.branchId);
        if (branch) {
            return await sendButtonMessage(
                from,
                `Continue with *${branch.name}* or choose another? 📍`,
                [
                    { id: `branch_${branch.id}`, title: 'Continue' },
                    { id: 'change_branch', title: 'Change Hub' }
                ],
                session.config
            );
        }
    }

    const branches = await Branch.findAll({
        where: { tenantId: tenant.id },
        order: [['name', 'ASC']]
    });

    if (branches.length === 0) {
        return await sendButtonMessage(from, `This store (${tenant.name}) doesn't have any branches set up yet. Please check back later! 🛍️`, [{ id: 'menu', title: 'Back to Menu' }], session.config);
    }

    if (branches.length === 1) {
        const branch = branches[0];
        session.state = 'SELECTING_CATEGORY';
        session.branchId = branch.id;

        if (!await validateShopOpen(from, session)) return;

        const categories = await Category.findAll({
            where: { branchId: branch.id },
            order: [['name', 'ASC']]
        });

        if (categories.length === 0) {
            return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, session.config);
        }
        return await sendListMessage(
            from,
            `Welcome to ${branch.name}! 👋\n\nChoose a category below`,
            'View Categories',
            [{
                title: '📂 Categories',
                rows: categories.map(c => ({
                    id: `category_${c.id}`,
                    title: c.name.slice(0, 24),
                    description: c.description || 'Browse products'
                }))
            }],
            session.config
        );
    }

    session.state = 'SELECTING_BRANCH';
    await sendListMessage(
        from,
        getTenantMessage(tenant, 'chooseBranchMessage', '📍 Choose your nearest branch'),
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(branch => ({
                id: `branch_${branch.id}`,
                title: branch.name.slice(0, 24),
                description: branch.address || 'Select branch'
            }))
        }],
        session.config
    );
};

const handleAllProducts = async (from, session, tenant) => {
    if (!await validateShopOpen(from, session)) return;

    if (!session.branchId) {
        return await handleChangeBranch(from, session, tenant);
    }

    session.state = 'VIEWING_ALL_PRODUCTS';
    if (!session.page) session.page = 1;

    const page = session.page;
    const limit = 10;

    const { count, rows: products } = await Product.findAndCountAll({
        where: { branchId: session.branchId },
        order: [['priority', 'ASC'], ['name', 'ASC']],
        limit,
        offset: (page - 1) * limit
    });

    if (count === 0) {
        return await sendTextMessage(from, "🛍️ No products available in this branch yet.", session.config);
    }

    if (session.catalogId && session.config.displayMode !== 'carousel') {
        const uniqueRetailerIds = new Set();
        const productItems = [];
        products.forEach(p => {
            if (p.retailerId && !uniqueRetailerIds.has(p.retailerId)) {
                uniqueRetailerIds.add(p.retailerId);
                productItems.push({ product_retailer_id: p.retailerId });
            }
        });

        const sections = [{
            title: `All Products (Page ${page})`,
            product_items: productItems
        }];

        await sendMultiProductMessage(from, session.catalogId, '🛍️ Our Collection', 'Browse all items below', sections, session.config);

        const optionRows = [];
        if (count > page * limit) {
            optionRows.push({ id: `all_products_page_${page + 1}`, title: 'Next Page ➡️', description: 'See more products' });
        }
        if (page > 1) {
            optionRows.push({ id: `all_products_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });
        }
        optionRows.push({ id: 'change_category', title: '📂 Browse Categories', description: 'Switch to category view' });
        optionRows.push({ id: 'menu', title: '🏠 Back to Home', description: 'Return to main menu' });

        await sendListMessage(from, "⚙️ *Shopping Options*", "Options", [{ title: "Options", rows: optionRows }], session.config);
    } else {
        if (products.length === 1) {
            await sendProductCardMessage(from, products[0], session.config);
        } else {
            const carouselCards = products.map(p => ({
                image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
                title: p.name.slice(0, 32),
                buttons: [
                    { id: `product_${p.id}`, title: 'View Details' },
                    { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
                ]
            }));
            await sendCarouselMessage(from, `🛍️ *All Products* (Page ${page})`, carouselCards, session.config);
        }
    }
};

const handleBranchSelection = async (from, text, session) => {
    console.log(`[Flow] Entering 'branch_' block for ${from}: ${text}`);
    const branchId = text.replace('branch_', '');
    const branch = await Branch.findByPk(branchId);

    if (branch) {
        session.branchId = branch.id;
        session.categoryId = null;
        session.page = 1;

        if (!await validateShopOpen(from, session)) return;

        try {
            await Customer.update({ branchId: branch.id }, { where: { phone: from } });
        } catch (e) {
            console.error("Failed to update customer branch:", e.message);
        }

        if (session.intent === 'view_all') {
            session.intent = null;
            const tenant = await Tenant.findByPk(session.tenantId);
            return await handleAllProducts(from, session, tenant);
        }

        session.state = 'SELECTING_CATEGORY';
        const page = session.page || 1;
        const limit = 10;
        const { count, rows: categories } = await Category.findAndCountAll({
            where: { branchId: branch.id },
            order: [['name', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        if (count === 0) {
            return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, session.config);
        }

        const rows = categories.map(category => ({
            id: `category_${category.id}`,
            title: category.name.slice(0, 24),
            description: category.description || 'Browse products'
        }));

        if (count > page * limit) {
            rows.push({ id: `shop_page_${page + 1}`, title: 'Next Page ➡️', description: 'See more categories' });
        }
        if (page > 1) {
            rows.push({ id: `shop_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });
        }

        await sendListMessage(
            from,
            `Welcome to ${branch.name}! 👋 (Page ${page})\n\nChoose a category below`,
            'View Categories',
            [{ title: '📂 Categories', rows }],
            session.config
        );
    }
};

const handleCategorySelection = async (from, text, session) => {
    if (!await validateShopOpen(from, session)) return;
    const categoryId = text.replace('category_', '');
    const category = await Category.findByPk(categoryId);

    if (category) {
        await logCustomerActivity(from, session.tenantId, session.branchId || category.branchId, 'CATEGORY_VIEWED', { categoryId: category.id, categoryName: category.name });
        const branchId = session.branchId || category.branchId;

        session.state = 'SELECTING_PRODUCT';
        session.categoryId = category.id;
        session.branchId = branchId;
        if (!session.page) session.page = 1;
        if (!session.sort) session.sort = 'name_ASC';

        const page = session.page;
        const limit = 10;
        const sort = session.sort;
        const orderAttr = sort === 'price_low' ? [['price', 'ASC']] : sort === 'price_high' ? [['price', 'DESC']] : [['name', 'ASC']];

        const { count, rows: catProducts } = await Product.findAndCountAll({
            where: { categoryId: category.id, branchId: branchId },
            order: [['priority', 'ASC'], ...orderAttr],
            limit: limit,
            offset: (page - 1) * limit
        });

        console.log(`[DEBUG] Category Selection - Catalog ID: ${session.catalogId}`);
        if (session.catalogId && session.config.displayMode !== 'carousel') {
            const uniqueRetailerIds = new Set();
            const productItems = [];

            catProducts.forEach(p => {
                if (p.retailerId && !uniqueRetailerIds.has(p.retailerId)) {
                    uniqueRetailerIds.add(p.retailerId);
                    productItems.push({ product_retailer_id: p.retailerId });
                }
            });

            if (productItems.length === 0) {
                await sendTextMessage(from, "🛍️ No products available in this category yet.", session.config);
            } else if (productItems.length === 1) {
                // If only 1 product has a Retailer ID, use Single Product Message
                const singleProd = catProducts.find(p => p.retailerId === productItems[0].product_retailer_id);
                await sendProductCardMessage(from, singleProd, session.config);
            } else {
                const sections = [
                    {
                        title: `${category.name} Collection`.slice(0, 24),
                        product_items: productItems
                    }
                ];

                console.log(`[DEBUG] Sending MPM for category: ${category.name}, IDs:`, JSON.stringify(productItems));
                await sendMultiProductMessage(from, session.catalogId, `🛍️ ${category.name}`, 'Choose a product below', sections, session.config);
            }

            const optionRows = [];
            if (count > page * limit) {
                optionRows.push({ id: `next_page_${category.id}`, title: 'Next Page ➡️', description: `View more in ${category.name}` });
            }
            if (page > 1) {
                optionRows.push({ id: `prev_page_${category.id}`, title: '⬅️ Previous Page', description: 'Go back' });
            }

            optionRows.push({ id: `sort_toggle_${category.id}`, title: '🔃 Sort By Price', description: 'Switch between High/Low' });
            optionRows.push({ id: 'change_category', title: '📂 Change Category', description: 'Browse other collections' });
            optionRows.push({ id: 'menu', title: '🏠 Back to Home', description: 'Return to main menu' });

            await sendListMessage(from, "⚙️ *Shopping Options*", "Options", [{ title: "Options", rows: optionRows }], session.config);
        } else {
            // Fallback for tenants without a catalog
            if (catProducts.length === 1) {
                await sendProductCardMessage(from, catProducts[0], session.config);
            } else {
                const carouselCards = catProducts.map(p => ({
                    image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
                    title: p.name.slice(0, 32),
                    buttons: [
                        { id: `product_${p.id}`, title: 'View Details' },
                        { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
                    ]
                }));

                await sendCarouselMessage(from, `🛍️ *${category.name}*`, carouselCards, session.config);
            }
        }
    } else {
        await sendTextMessage(from, 'Invalid category ❌', session.config);
    }
};

const handlePaginationAndSorting = async (from, text, session) => {
    if (text.startsWith('next_page_')) {
        session.page = (session.page || 1) + 1;
        return `category_${text.replace('next_page_', '')}`;
    } else if (text.startsWith('prev_page_')) {
        session.page = Math.max(1, (session.page || 1) - 1);
        return `category_${text.replace('prev_page_', '')}`;
    } else if (text.startsWith('sort_toggle_')) {
        const categoryId = text.replace('sort_toggle_', '');
        await sendButtonMessage(from, "🔃 *Sort Products*\n\nHow would you like to view items?", [
            { id: `sort_low_${categoryId}`, title: 'Price: Low to High' },
            { id: `sort_high_${categoryId}`, title: 'Price: High to Low' },
            { id: `sort_name_${categoryId}`, title: 'Name: A-Z' }
        ], session.config);
        return null;
    } else if (text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
        const categoryId = text.split('_').pop();
        session.sort = text.startsWith('sort_low') ? 'price_low' : text.startsWith('sort_high') ? 'price_high' : 'name_ASC';
        session.page = 1;
        return `category_${categoryId}`;
    }
    return null;
};

const handleProductSelection = async (from, text, session) => {
    const productId = text.replace('product_', '');
    const selectedProduct = await Product.findByPk(productId);

    if (selectedProduct) {
        await logCustomerActivity(from, session.tenantId, session.branchId || selectedProduct.branchId, 'PRODUCT_VIEWED', { productId: selectedProduct.id, productName: selectedProduct.name });
        session.state = 'VIEWING_PRODUCT';
        session.productId = selectedProduct.id;

        if (session.catalogId && session.config.displayMode !== 'carousel') {
            await sendSingleProductMessage(from, session.catalogId, selectedProduct.retailerId, `🔥 ${selectedProduct.name}`, 'Friska 🛍️', session.config);
        } else {
            await sendProductCardMessage(from, selectedProduct, session.config);
        }
    } else {
        await sendTextMessage(from, 'Invalid product ❌', session.config);
    }
};

const handleAddToCart = async (from, text, session) => {
    console.log(`[Flow] Entering 'add_'/'buy_' block for ${from}: ${text}`);
    const type = text.startsWith('add_') ? 'add' : 'buy';
    const productId = text.replace('add_', '').replace('buy_', '');
    const product = await Product.findByPk(productId);

    if (product) {
        await logCustomerActivity(from, session.tenantId, session.branchId || product.branchId, 'ADDED_TO_CART', { productId: product.id, productName: product.name });
        session.state = 'COLLECTING_QUANTITY';
        session.pendingAction = type;
        session.pendingProductId = product.id;
        await sendTextMessage(from, `🔢 How many *${product.name}* would you like? (Please enter a number)`, session.config);
    }
};

const handleQuantitySelection = async (from, text, session) => {
    if (!isNaN(text)) {
        const qty = parseInt(text);
        if (qty <= 0) return await sendTextMessage(from, "Please enter a valid quantity (1 or more).", session.config);

        const productId = session.pendingProductId;
        const action = session.pendingAction;
        const product = await Product.findByPk(productId);

        if (product) {
            const existingInCart = carts[from]?.find(it => it.id === product.id)?.quantity || 0;
            const totalRequested = (action === 'add' ? existingInCart : 0) + qty;

            if (product.stock !== null && product.stock <= 0) {
                return await sendTextMessage(from, `❌ Sorry, *${product.name}* is currently out of stock.`, session.config);
            }

            if (product.stock !== null && totalRequested > product.stock) {
                const availableToAdd = product.stock - (action === 'add' ? existingInCart : 0);
                if (availableToAdd <= 0) {
                    return await sendTextMessage(from, `⚠️ You already have the maximum available stock (*${product.stock}*) of *${product.name}* in your cart.`, session.config);
                } else {
                    return await sendTextMessage(from, `⚠️ Only *${product.stock}* units of *${product.name}* are available. ${action === 'add' && existingInCart > 0 ? `You already have *${existingInCart}* in your cart. ` : ''}Please enter a quantity of *${availableToAdd}* or less.`, session.config);
                }
            }

            if (action === 'add') {
                if (!carts[from]) carts[from] = [];
                const existing = carts[from].find(it => it.id === product.id);
                if (existing) existing.quantity += qty;
                else carts[from].push({ id: product.id, name: product.name, price: product.price, quantity: qty });

                session.state = 'SELECTING_PRODUCT';
                session.abandonedNotified = false;

                await sendButtonMessage(from, `✅ Added ${qty}x *${product.name}* to cart`, [
                    { id: 'shop', title: 'Shop More' },
                    { id: 'cart', title: 'View Cart' },
                    { id: 'checkout', title: 'Checkout' }
                ], session.config);
            } else {
                carts[from] = [{ id: product.id, name: product.name, price: product.price, quantity: qty }];
                session.state = 'CHECKOUT_ADDRESS';
                await sendTextMessage(from, `📍 Enter delivery address for ${qty}x ${product.name}`, session.config);
            }
        }
    } else {
        await sendTextMessage(from, "❌ Invalid quantity. Please enter a number (e.g., 1, 2, 5).", session.config);
    }
};

const handleCart = async (from, session, tenant) => {
    console.log(`[Flow] Entering 'cart' block for ${from}`);
    const userCart = carts[from] || [];

    if (userCart.length === 0) {
        const msg = getTenantMessage(tenant, 'cartEmptyMessage', '🛒 Your cart is empty');
        await sendButtonMessage(from, msg, [{ id: 'shop', title: 'Shop' }], session.config);
    } else {
        let subtotal = 0;
        const cartItemsText = userCart.map(item => {
            subtotal += item.price * item.quantity;
            return `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`;
        }).join('\n');

        const bestOffer = await calculateBestOffer(from, session.branchId, subtotal, session.tenantId);
        let total = subtotal;
        let offerText = '';

        if (bestOffer) {
            total = subtotal - bestOffer.calculatedDiscount;
            offerText = `\n\n🎁 *Offer Applied: ${bestOffer.code}*\nDiscount: -₹${bestOffer.calculatedDiscount}${bestOffer.discountType === 'percentage' ? ` (${bestOffer.discountValue}%)` : ''}`;
        }

        await sendButtonMessage(
            from,
            `🛒 Your Cart\n\n${cartItemsText}\n\n💰 Subtotal: ₹${subtotal}${offerText}\n\n✅ *Final Total: ₹${total}*`,
            [
                { id: 'shop', title: 'Shop More' },
                { id: 'checkout', title: 'Checkout' }
            ],
            session.config
        );
    }
};
const checkCartStock = async (userCart) => {
    for (const item of userCart) {
        const product = await Product.findByPk(item.id);
        if (!product) return `❌ Product *${item.name}* is no longer available.`;
        if (product.stock !== null && product.stock < item.quantity) {
            if (product.stock <= 0) {
                return `❌ Sorry, *${product.name}* just went out of stock.`;
            } else {
                return `❌ Sorry, only *${product.stock}* units of *${product.name}* are available now.`;
            }
        }
    }
    return null;
};
const handleCheckout = async (from, session, tenant) => {
    const userCart = carts[from] || [];
    if (userCart.length === 0) {
        const msg = getTenantMessage(tenant, 'cartEmptyMessage', '🛒 Cart is empty');
        await sendButtonMessage(from, msg, [{ id: 'shop', title: 'Shop' }], session.config);
    } else {
        // Check stock before proceeding
        const stockError = await checkCartStock(userCart);
        if (stockError) {
            return await sendButtonMessage(from, `${stockError}\n\nPlease update your cart before proceeding.`, [
                { id: 'cart', title: '🛒 View Cart' },
                { id: 'menu', title: '🏠 Back to Menu' }
            ], session.config);
        }

        const addresses = await CustomerAddress.findAll({ where: { customerPhone: from } });

        if (addresses.length > 0) {
            session.state = 'CHECKOUT_SELECT_ADDRESS';

            const rows = addresses.map(addr => ({
                id: `address_${addr.id}`,
                title: addr.label || 'Saved Address',
                description: addr.formattedAddress ? addr.formattedAddress.substring(0, 72) : addr.address.substring(0, 72)
            }));

            rows.push({
                id: 'address_new',
                title: '➕ Add New Address',
                description: 'Send a new location or type a new address'
            });

            const msgText = getTenantMessage(tenant, 'selectAddressMessage', 'Where should we deliver? Select a saved address or add a new one.');
            await sendListMessage(
                from,
                msgText,
                'View Addresses',
                [{ title: 'Saved Addresses', rows }],
                session.config
            );
        } else {
            session.state = 'CHECKOUT_ADDRESS';
            const msg = getTenantMessage(tenant, 'enterAddressMessage', '📍 Please enter your delivery address');
            await sendLocationRequest(from, msg, session.config);
        }
    }
};

const handleAddressCollection = async (from, text, session, tenant) => {
    session.address = text;

    try {
        await CustomerAddress.create({
            customerPhone: from,
            address: text,
            formattedAddress: session.formattedAddress || null,
            label: 'Saved Address'
        });
    } catch (e) {
        console.error('Failed to save customer address:', e);
    }

    session.state = 'CHECKOUT_PAYMENT';

    const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
    await sendButtonMessage(
        from,
        msg,
        [
            { id: 'pay_cod', title: 'Cash on Delivery' }
        ],
        session.config
    );
};

const handlePaymentSelection = async (from, text, session, tenant) => {
    const paymentMethod = text === 'pay_cod' ? 'Cash on Delivery' : 'Online Payment';
    const address = session.address || 'N/A';

    let userCart = carts[from] || [];
    let isCatalogOrder = false;

    // Detect and handle catalog orders
    if (userCart.length === 0 && session.lastCatalogOrder) {
        isCatalogOrder = true;
        // We treat the catalog order text as the items description for now
        userCart = [{
            name: 'Catalog Order',
            price: 0,
            quantity: 1,
            isCatalog: true,
            description: session.lastCatalogOrder
        }];
    }

    if (userCart.length === 0) {
        return await sendButtonMessage(from, '🛒 Your cart is empty.', [{ id: 'menu', title: 'Back to Menu' }], session.config);
    }

    // Final stock check (skip for catalog orders as we don't have product IDs)
    if (!isCatalogOrder) {
        const stockError = await checkCartStock(userCart);
        if (stockError) {
            return await sendButtonMessage(from, `${stockError}\n\nSomeone else just grabbed the last items! Please update your cart.`, [
                { id: 'cart', title: '🛒 View Cart' },
                { id: 'menu', title: '🏠 Back to Menu' }
            ], session.config);
        }
    }

    let subtotal = 0;
    if (isCatalogOrder) {
        // Robust regex to capture amount even if there are formatting characters or extra spaces
        // Robust regex to capture amount even if there are formatting characters or extra spaces
        const match = session.lastCatalogOrder.match(/total amount:?\s*₹?\s*([\d,]+(\.\d+)?)/i);
        const amountStr = match ? match[1].replace(/,/g, '') : '0';
        subtotal = parseInt(amountStr);

        console.log(`[Catalog Order] Extracted Amount: ${subtotal} from text: "${session.lastCatalogOrder.substring(0, 50)}..."`);

        // Update the pseudo-item price for record keeping
        userCart[0].price = subtotal;
    } else {
        userCart.forEach(item => { subtotal += item.price * item.quantity; });
    }

    const bestOffer = await calculateBestOffer(from, session.branchId, subtotal, session.tenantId);
    let total = subtotal;
    let discountAmount = 0;
    let appliedOfferCode = null;

    if (bestOffer) {
        discountAmount = bestOffer.calculatedDiscount;
        total = subtotal - discountAmount;
        appliedOfferCode = bestOffer.code;
    }

    let savedOrder;
    try {
        savedOrder = await Order.create({
            customerPhone: from,
            address,
            formattedAddress: session.formattedAddress || null,
            items: userCart,
            total,
            discountAmount,
            appliedOfferCode,
            status: 'pending',
            branchId: session.branchId,
            paymentMethod,
            paymentStatus: 'pending'
        });
    } catch (e) {
        console.error('Order save error:', e);
    }

    // Centralized post-order logic (Stock deduction, Offer tracking)
    if (savedOrder) {
        await orderService.handleOrderSuccess(savedOrder);
    }

    carts[from] = [];
    session.state = 'ORDER_CONFIRMED';
    delete session.address;
    delete session.lastCatalogOrder; // Clear catalog order after success

    // Send push notification to tenant admins
    if (savedOrder && session.tenantId) {
        notificationService.sendToTenant(
            session.tenantId,
            `🛒 New Order #${savedOrder.id}`,
            `₹${total} from +${from} (${paymentMethod})`,
            'new_order',
            { orderId: savedOrder.id, total, customerPhone: from, branchId: session.branchId }
        ).catch(err => console.error('[FCM trigger error]', err.message));
    }

    if (paymentMethod === 'Online Payment' && savedOrder) {
        try {
            const tenantObj = await Tenant.findByPk(session.tenantId);
            const paymentLink = await createPaymentLink(savedOrder, tenantObj);
            await sendTextMessage(from, `🔗 *Payment Link Generated*\n\nPlease complete your payment of *₹${total}* using the link below:\n\n${paymentLink.short_url}\n\n*Note:* Your order will be processed once payment is confirmed.`, session.config);
        } catch (payError) {
            console.error('Payment Link Error:', payError);
            await sendTextMessage(from, "⚠️ We encountered an issue generating your payment link. Please try again or contact support.", session.config);
        }
    } else {
        let msg = getTenantMessage(tenant, 'orderConfirmedMessage', `✅ *Order Confirmed!* #{{order_id}}\n\nYour order has been placed successfully via *{{payment_method}}*.\n\nThank you for shopping with us! 🛍️`, {
            payment_method: paymentMethod,
            order_id: savedOrder?.id
        });

        // Always ensure summary is shown if not already in the custom message
        if (!msg.includes('₹')) {
            const summaryText = `\n\n💰 *Order Summary:*\nSubtotal: ₹${(savedOrder.total + savedOrder.discountAmount).toFixed(2)}\n${savedOrder.appliedOfferCode ? `Offer: ${savedOrder.appliedOfferCode} (-₹${savedOrder.discountAmount.toFixed(2)})\n` : ''}*Final Total: ₹${savedOrder.total.toFixed(2)}*`;
            msg += summaryText;
        }

        await sendTextMessage(from, msg, session.config);
    }

    await sendButtonMessage(from, "What would you like to do next?", [
        { id: 'track', title: 'Track Order 🚚' },
        { id: 'menu', title: 'Main Menu 🏠' }
    ], session.config);
};

const handleNativeOrder = async (from, message, session, tenant) => {
    const orderData = message.order;
    const productItems = orderData.product_items;

    if (!productItems || productItems.length === 0) return;

    // Convert native payload to our cart format
    const newCart = [];
    for (const item of productItems) {
        const product = await Product.findOne({ where: { retailerId: item.product_retailer_id, branchId: session.branchId || { [Op.not]: null } } });
        if (product) {
            newCart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(item.item_price),
                quantity: parseInt(item.quantity)
            });
        }
    }

    if (newCart.length > 0) {
        carts[from] = newCart;
        session.state = 'CHECKOUT_ADDRESS';
        await sendLocationRequest(from, '📍 We received your cart! Please enter your delivery address to confirm the order:', session.config);
    } else {
        await sendTextMessage(from, '❌ There was an error processing your cart. Products may be out of stock or unavailable.', session.config);
    }
};

const handleDefault = async (from, text, session, tenant) => {
    // 1. Handle Audio/Media placeholders first to avoid AI processing
    if (text.includes('[Audio Message]')) {
        // Log as support request
        await logCustomerActivity(from, tenant.id, session.branchId, 'SUPPORT_REQUEST', {
            message: text,
            autoGenerated: true
        });

        // Notify tenant via push
        notificationService.sendToTenant(
            tenant.id,
            '🆘 New Audio Support Request',
            `From +${from}: ${text.split(' (ID:')[0]}`,
            'support_request',
            { customerPhone: from, message: text, branchId: session.branchId }
        ).catch(err => console.error('[FCM trigger error]', err.message));

        // Respond to customer
        await sendButtonMessage(
            from,
            '🎧 *Audio Received*\n\nWe received your audio message. Since I am a bot, I cannot listen to it, but I have forwarded it to our human support team! 🆘',
            [
                { id: 'shop', title: 'Shop' },
                { id: 'cart', title: 'Cart' },
                { id: 'track', title: 'Track Order' }
            ],
            session.config
        );
        return;
    }

    // 2. Attempt to get an AI response if it's a regular text message (not a button payload)
    if (text && text.length > 2 && !text.includes('_')) {
        const aiReply = await aiService.generateSupportResponse(tenant, session, text);
        if (aiReply) {
            await sendTextMessage(from, aiReply, session.config);
            return;
        }
    }

    // 3. Fallback to default menu
    await sendButtonMessage(
        from,
        'Choose an option 👇',
        [
            { id: 'shop', title: 'Shop' },
            { id: 'cart', title: 'Cart' },
            { id: 'track', title: 'Track Order' }
        ],
        session.config
    );
};

// =========================
// Main Webhook Controller
// =========================

const receiveWebhook = async (req, res) => {
    res.sendStatus(200);

    try {
        console.log('[Webhook] Raw Request Body:', JSON.stringify(req.body, null, 2));

        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const metadata = change?.value?.metadata;
        const message = change?.value?.messages?.[0];

        if (!message || !metadata) return;

        const from = message.from;
        const phoneNumberId = metadata.phone_number_id;
        const profileName = change?.value?.contacts?.[0]?.profile?.name || '';
        console.log(`[Webhook] Incoming from ID: ${phoneNumberId}`);

        const tenant = await Tenant.findOne({ where: { phoneNumberId, isActive: true } });
        if (!tenant) {
            console.error(`[Webhook] No active tenant found for ID: ${phoneNumberId}`);
            try {
                await sendTextMessage(from, "⚠️ This WhatsApp number is not yet fully configured on our platform. Please contact support. 🛍️", {
                    phoneNumberId: phoneNumberId,
                    whatsappToken: process.env.WHATSAPP_TOKEN
                });
            } catch (e) {
                console.error("Failed to send fallback error message:", e.message);
            }
            return;
        }

        const tenantConfig = {
            phoneNumberId: tenant.phoneNumberId,
            whatsappToken: tenant.whatsappToken,
            displayMode: tenant.displayMode || 'catalog'
        };

        // Send typing indicator to make the bot feel responsive
        await sendTypingIndicator(from, tenantConfig);

        const tenantBranchIds = (await Branch.findAll({ where: { tenantId: tenant.id }, attributes: ['id'] })).map(b => b.id);
        const customer = await Customer.findOne({
            where: {
                phone: from,
                branchId: { [Op.or]: [{ [Op.in]: tenantBranchIds }, { [Op.eq]: null }] }
            }
        });

        // const latestOrder = await Order.findOne({
        //     where: { customerPhone: from },
        //     order: [['createdAt', 'DESC']]
        // });

        const autoBranchId = tenantBranchIds.length === 1 ? tenantBranchIds[0] : null;

        if (!sessions[from]) {
            sessions[from] = {
                state: 'START',
                tenantId: tenant.id,
                branchId: customer?.branchId || autoBranchId,
                config: tenantConfig,
                catalogId: tenant.catalogId,
                lastInteraction: new Date()
            };
        } else {
            sessions[from].tenantId = tenant.id;
            sessions[from].config = tenantConfig;
            sessions[from].catalogId = tenant.catalogId;
            sessions[from].lastInteraction = new Date();
            if (!sessions[from].branchId) {
                sessions[from].branchId = customer?.branchId || autoBranchId;
            }
        }

        const session = sessions[from];

        try {
            await Customer.upsert({
                phone: from,
                name: profileName || (customer ? customer.name : ''),
                lastInteraction: new Date(),
                branchId: session.branchId || null
            });
        } catch (e) {
            console.error('Customer tracking error:', e.message);
        }

        let text = extractTextFromMessage(message);

        // Handle Reverse Geocoding if location is sent and API key exists
        if (message.type === 'location') {
            console.log(`[Geocoding] Location message received. API Key exists: ${!!tenant.googleMapsApiKey}`);
            if (tenant.googleMapsApiKey) {
                const resolvedAddress = await getAddressFromCoords(message.location.latitude, message.location.longitude, tenant.googleMapsApiKey);
                if (resolvedAddress) {
                    console.log(`[Geocoding] Success: ${message.location.latitude},${message.location.longitude} -> ${resolvedAddress}`);
                    session.formattedAddress = resolvedAddress;
                } else {
                    console.log(`[Geocoding] Failed: No address resolved for ${message.location.latitude},${message.location.longitude}`);
                }
            }
        } else if (message.type === 'text') {
            session.formattedAddress = null;
        }

        console.log('FROM:', from, 'TEXT:', text);

        // Visual Catalog Order Detection
        if (text.includes('new order from visual catalog')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT', { type: 'visual_catalog' });
            session.lastCatalogOrder = text;

            const addresses = await CustomerAddress.findAll({ where: { customerPhone: from } });

            if (addresses.length > 0) {
                session.state = 'CATALOG_SELECT_ADDRESS';

                const rows = addresses.map(addr => ({
                    id: `cataddress_${addr.id}`,
                    title: addr.label || 'Saved Address',
                    description: addr.formattedAddress ? addr.formattedAddress.substring(0, 72) : addr.address.substring(0, 72)
                }));

                rows.push({
                    id: 'cataddress_new',
                    title: '➕ Add New Address',
                    description: 'Send a new location or type a new address'
                });

                const msgText = getTenantMessage(tenant, 'selectAddressMessage', 'Where should we deliver? Select a saved address or add a new one.');
                await sendListMessage(
                    from,
                    msgText,
                    'View Addresses',
                    [{ title: 'Saved Addresses', rows }],
                    session.config
                );
            } else {
                session.state = 'CATALOG_ORDER_ADDRESS';

                // 1. Notify Admin/Merchant
                notificationService.sendToTenant(
                    tenant.id,
                    '🛍️ New Catalog Order',
                    `From +${from}: A customer just placed an order via the Visual Catalog. Waiting for their address...`,
                    'new_order',
                    { customerPhone: from, type: 'visual_catalog', branchId: session.branchId }
                ).catch(err => console.error('[FCM error]', err.message));

                // 2. Respond to Customer
                const responseMsg = getTenantMessage(tenant, 'catalogOrderReceived', "✅ *Order Received!*\n\nWe've received your order items. Please share your *Current Location* 📍 or type your *Delivery Address* below so we can process it immediately! 🛵");
                await sendLocationRequest(from, responseMsg, session.config);
            }
            return;
        }

        // Handle Address after Catalog Order (Manual Entry)
        if (session.state === 'CATALOG_ORDER_ADDRESS') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'ADDRESS_PROVIDED', { address: text });

            try {
                await CustomerAddress.create({
                    customerPhone: from,
                    address: text,
                    formattedAddress: session.formattedAddress || null,
                    label: 'Saved Address'
                });
            } catch (e) {
                console.error('Failed to save customer address:', e);
            }

            // Notify Merchant with the address
            notificationService.sendToTenant(
                tenant.id,
                '📍 Address Received',
                `Customer (+${from}) provided address: ${text}`,
                'address_update',
                { customerPhone: from, address: text, branchId: session.branchId }
            ).catch(err => console.error('[FCM error]', err.message));

            session.address = text;
            session.state = 'CHECKOUT_PAYMENT';
            const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
            await sendButtonMessage(
                from,
                msg,
                [
                    { id: 'pay_cod', title: 'Cash on Delivery' },
                    { id: 'pay_online', title: 'Online Payment' }
                ],
                session.config
            );
            return;
        }

        if (text === 'native_order') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT', { type: 'native_order' });
            await handleNativeOrder(from, message, session, tenant);
        } else if (text === 'hi' || text === 'hello' || text === 'start' || text === 'menu') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'MENU_VIEWED');
            await handleHomeMenu(from, session, tenant, customer);
        } else if (text === 'track' || text === 'status') {
            await handleTrackOrder(from, session);
        } else if (text.startsWith('view_order_')) {
            await handleViewOrder(from, text, session);
        } else if (text === 'search_mode') {
            await handleSearchMode(from, session, tenant);
        } else if (text === 'support') {
            await handleSupport(from, session, tenant);
        } else if (text === 'support_order_yes') {
            await handleSupportOrderList(from, session);
        } else if (text === 'support_order_no') {
            session.state = 'SUPPORT';
            session.supportOrderId = null;
            await sendTextMessage(from, "Please describe your issue below:", session.config);
        } else if (text.startsWith('support_order_')) {
            const orderId = text.replace('support_order_', '');
            session.supportOrderId = orderId;
            session.state = 'SUPPORT';
            await sendTextMessage(from, `Issue related to *Order #${orderId}*.\n\nPlease describe the problem:`, session.config);
        } else if (session.state === 'SUPPORT') {
            let logBranchId = session.branchId;

            // If linked to an order, try to get that order's branchId
            if (session.supportOrderId) {
                const order = await Order.findByPk(session.supportOrderId);
                if (order) logBranchId = order.branchId;
            }

            await logCustomerActivity(from, tenant.id, logBranchId, 'SUPPORT_REQUEST', {
                message: text,
                orderId: session.supportOrderId || null
            });
            session.state = 'START';
            session.supportOrderId = null;

            // Send push notification for support request
            if (tenant?.id) {
                notificationService.sendToTenant(
                    tenant.id,
                    '🆘 New Support Request',
                    `From +${from}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`,
                    'support_request',
                    { customerPhone: from, message: text, orderId: session.supportOrderId || null, branchId: logBranchId }
                ).catch(err => console.error('[FCM trigger error]', err.message));
            }

            await sendButtonMessage(from, "✅ *Message Received!*\n\nThank you for reaching out. Our support team has been notified and will contact you shortly.", [{ id: 'menu', title: 'Back to Menu' }], session.config);
        } else if (text === 'shop' || text === 'change_category') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'SHOP_VIEWED');
            await handleShop(from, text, session, tenant, customer);
        } else if (text === 'all_products') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'SHOP_VIEWED', { mode: 'all_products' });
            session.intent = 'view_all';
            session.page = 1;
            await handleAllProducts(from, session, tenant);
        } else if (text.startsWith('all_products_page_')) {
            session.page = parseInt(text.replace('all_products_page_', ''));
            await handleAllProducts(from, session, tenant);
        } else if (text.startsWith('cancel_order_')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'ORDER_CANCELLED');
            await handleCancelOrder(from, text, session);
        } else if (text === 'change_branch') {
            await handleChangeBranch(from, session, tenant);
        } else if (text.startsWith('branch_')) {
            await handleBranchSelection(from, text, session);
        } else if (text.startsWith('next_page_') || text.startsWith('prev_page_') || text.startsWith('sort_toggle_') || text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
            const nextText = await handlePaginationAndSorting(from, text, session);
            if (nextText) await handleCategorySelection(from, nextText, session);
        } else if (text.startsWith('shop_page_')) {
            session.page = parseInt(text.replace('shop_page_', ''));
            await handleShop(from, 'shop', session, tenant, customer);
        } else if (text.startsWith('search_page_')) {
            session.page = parseInt(text.replace('search_page_', ''));
            // Re-run search with the stored query
            if (session.searchQuery) {
                await handleSearching(from, session.searchQuery, session);
            } else {
                await handleHomeMenu(from, session, tenant, customer);
            }
        } else if (text.startsWith('category_')) {
            await handleCategorySelection(from, text, session);
        } else if (text.startsWith('product_')) {
            await handleProductSelection(from, text, session);
        } else if (text.startsWith('add_') || text.startsWith('buy_')) {
            await handleAddToCart(from, text, session);
        } else if (session.state === 'COLLECTING_QUANTITY') {
            await handleQuantitySelection(from, text, session);
        } else if (text === 'cart') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CART_VIEWED');
            await handleCart(from, session, tenant);
        } else if (text === 'checkout') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT_STARTED');
            await handleCheckout(from, session, tenant);
        } else if (session.state === 'CHECKOUT_SELECT_ADDRESS') {
            if (text === 'address_new') {
                session.state = 'CHECKOUT_ADDRESS';
                const msg = getTenantMessage(tenant, 'enterAddressMessage', '📍 Please send your current location or type your new delivery address');
                await sendLocationRequest(from, msg, session.config);
            } else if (text.startsWith('address_')) {
                const addressId = text.split('_')[1];
                const selectedAddress = await CustomerAddress.findOne({ where: { id: addressId, customerPhone: from } });

                if (selectedAddress) {
                    session.address = selectedAddress.address;
                    session.formattedAddress = selectedAddress.formattedAddress;

                    session.state = 'CHECKOUT_PAYMENT';
                    const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
                    await sendButtonMessage(
                        from,
                        msg,
                        [
                            { id: 'pay_cod', title: 'Cash on Delivery' }
                        ],
                        session.config
                    );
                } else {
                    await sendTextMessage(from, '❌ Invalid address selected. Please try again.', session.config);
                }
            } else {
                await handleAddressCollection(from, text, session, tenant);
            }
        } else if (session.state === 'CATALOG_SELECT_ADDRESS') {
            if (text === 'cataddress_new') {
                session.state = 'CATALOG_ORDER_ADDRESS';
                const responseMsg = getTenantMessage(tenant, 'catalogOrderReceived', "✅ *Order Received!*\n\nWe've received your order items. Please share your *Current Location* 📍 or type your *Delivery Address* below so we can process it immediately! 🛵");
                await sendLocationRequest(from, responseMsg, session.config);
            } else if (text.startsWith('cataddress_')) {
                const addressId = text.split('_')[1];
                const selectedAddress = await CustomerAddress.findOne({ where: { id: addressId, customerPhone: from } });

                if (selectedAddress) {
                    session.formattedAddress = selectedAddress.formattedAddress;
                    session.address = selectedAddress.address;
                    session.state = 'CHECKOUT_PAYMENT';
                    const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
                    await sendButtonMessage(
                        from,
                        msg,
                        [
                            { id: 'pay_cod', title: 'Cash on Delivery' },
                            { id: 'pay_online', title: 'Online Payment' }
                        ],
                        session.config
                    );
                } else {
                    await sendTextMessage(from, '❌ Invalid address selected. Please try again.', session.config);
                }
            } else {
                await logCustomerActivity(from, tenant.id, session.branchId, 'ADDRESS_PROVIDED', { address: text });

                try {
                    await CustomerAddress.create({
                        customerPhone: from,
                        address: text,
                        formattedAddress: session.formattedAddress || null,
                        label: 'Saved Address'
                    });
                } catch (e) {
                    console.error('Failed to save customer address:', e);
                }

                notificationService.sendToTenant(
                    tenant.id,
                    '📍 Address Received',
                    `Customer (+${from}) provided address: ${text}`,
                    'address_update',
                    { customerPhone: from, address: text, branchId: session.branchId }
                ).catch(err => console.error('[FCM error]', err.message));

                session.address = text;
                session.state = 'CHECKOUT_PAYMENT';
                const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
                await sendButtonMessage(
                    from,
                    msg,
                    [
                        { id: 'pay_cod', title: 'Cash on Delivery' },
                        { id: 'pay_online', title: 'Online Payment' }
                    ],
                    session.config
                );
            }
        } else if (session.state === 'CHECKOUT_ADDRESS') {
            await handleAddressCollection(from, text, session, tenant);
        } else if (session.state === 'CHECKOUT_PAYMENT') {
            await handlePaymentSelection(from, text, session, tenant);
        } else {
            await handleDefault(from, text, session, tenant);
        }

    } catch (error) {
        console.error(error.response?.data || error.message);
    }
};

// =========================
// OFFER CALCULATION HELPERS
// =========================

const calculateBestOffer = async (from, branchId, cartTotal, tenantId) => {
    try {
        // If branchId is missing (e.g. fresh catalog session), try to find a default branch for the tenant
        if (!branchId && tenantId) {
            const firstBranch = await Branch.findOne({ where: { tenantId } });
            if (firstBranch) branchId = firstBranch.id;
        }

        const now = moment().tz('Asia/Kolkata').toDate();
        const offers = await Offer.findAll({
            where: {
                branchId,
                isActive: true,
                minOrderValue: { [Op.lte]: cartTotal },
                [Op.or]: [
                    { startDate: null },
                    { startDate: { [Op.lte]: now } }
                ],
                [Op.or]: [
                    { endDate: null },
                    { endDate: { [Op.gte]: moment().tz('Asia/Kolkata').startOf('day').toDate() } }
                ]
            }
        });

        if (offers.length === 0) return null;

        const customerOrdersCount = await Order.count({ where: { customerPhone: from, status: { [Op.ne]: 'cancelled' } } });

        let bestOffer = null;
        let maxDiscountAmount = 0;

        for (const offer of offers) {
            // Check usage limits
            if (offer.usageLimit !== null && offer.usageLimit <= 0) continue;

            if (offer.usageType === 'first_order_only' && customerOrdersCount > 0) continue;
            if (offer.usageType === 'once_per_customer') {
                const usedBefore = await Order.findOne({ where: { customerPhone: from, appliedOfferCode: offer.code, status: { [Op.ne]: 'cancelled' } } });
                if (usedBefore) continue;
            }

            let discount = 0;
            if (offer.discountType === 'flat') {
                discount = offer.discountValue;
            } else {
                discount = (cartTotal * offer.discountValue) / 100;
                if (offer.maxDiscount && discount > offer.maxDiscount) {
                    discount = offer.maxDiscount;
                }
            }

            if (discount > maxDiscountAmount) {
                maxDiscountAmount = discount;
                bestOffer = { ...offer.toJSON(), calculatedDiscount: discount };
            }
        }

        return bestOffer;
    } catch (error) {
        console.error('[Offer Calc Error]', error.message);
        return null;
    }
};

// =========================
// ABANDONED CART MONITOR
// =========================

const checkAbandonedCarts = async () => {
    const now = new Date();
    const threshold = 1 * 60 * 60 * 1000;

    for (const [phoneNumber, session] of Object.entries(sessions)) {
        const cart = carts[phoneNumber] || [];
        if (cart.length > 0 && session.lastInteraction) {
            const idleTime = now - new Date(session.lastInteraction);

            if (idleTime > threshold && !session.abandonedNotified) {
                try {
                    const tenant = await Tenant.findByPk(session.tenantId);
                    if (!tenant) continue;

                    console.log(`[Monitor] Sending abandoned cart reminder to ${phoneNumber}`);
                    const msg = getTenantMessage(tenant, 'abandonedCartMessage', "👋 Hey! We noticed you have items in your cart. Would you like to complete your order? 🛒");
                    await sendTextMessage(
                        phoneNumber,
                        msg,
                        session.config
                    );
                    session.abandonedNotified = true;
                } catch (e) {
                    console.error(`[Monitor] Failed to send reminder to ${phoneNumber}:`, e.message);
                }
            }
        }
    }
};

setInterval(checkAbandonedCarts, 10 * 60 * 1000);

module.exports = {
    verifyWebhook,
    receiveWebhook
};