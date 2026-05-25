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

const { Op } = require('sequelize');
const moment = require('moment-timezone');
const notificationService = require('../services/notificationService');
const orderService = require('../services/orderService');
const { createPaymentLink } = require('../services/paymentService');
const aiService = require('../services/aiService');

// =========================
// In-Memory State
// sessions: { [phone]: { state, tenantId, branchId, config, catalogId, lastInteraction, ... } }
// carts:    { [phone]: [{ id, name, price, quantity }] }
// =========================
const sessions = {};
const carts = {};

// Deduplicate incoming webhooks: track last processed message ID per phone
const processedMessages = new Map(); // phone -> { msgId, ts }

// Rate-limit outgoing messages per phone (max N per window)
const rateLimiter = new Map(); // phone -> { count, windowStart }
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// Session TTL: expire idle sessions after 24 h to free memory
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// =========================
// Webhook Verification
// =========================
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// =========================
// Helper: Rate Limiter
// =========================
const isRateLimited = (phone) => {
    const now = Date.now();
    const entry = rateLimiter.get(phone);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimiter.set(phone, { count: 1, windowStart: now });
        return false;
    }
    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
        console.warn(`[RateLimit] Throttling messages to ${phone}`);
        return true;
    }
    return false;
};

// =========================
// Helper: Session TTL cleanup
// =========================
const pruneExpiredSessions = () => {
    const now = Date.now();
    for (const [phone, session] of Object.entries(sessions)) {
        if (session.lastInteraction && now - new Date(session.lastInteraction).getTime() > SESSION_TTL_MS) {
            delete sessions[phone];
            delete carts[phone];
            console.log(`[Session] Pruned expired session for ${phone}`);
        }
    }

    // Prune stale deduplication records (keep only entries < 10 min old)
    const DEDUP_TTL_MS = 10 * 60_000;
    for (const [phone, entry] of processedMessages.entries()) {
        if (now - entry.ts > DEDUP_TTL_MS) {
            processedMessages.delete(phone);
        }
    }
};
setInterval(pruneExpiredSessions, 60 * 60 * 1000); // every hour

// =========================
// Helper: Deduplicate Messages
// =========================
const isDuplicateMessage = (phone, msgId) => {
    const last = processedMessages.get(phone);
    if (last && last.msgId === msgId) return true;
    processedMessages.set(phone, { msgId, ts: Date.now() });
    return false;
};

// =========================
// Helper: Branch Hours
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

// =========================
// Helper: Activity Logging
// =========================
const logCustomerActivity = async (phone, tenantId, branchId, actionType, details = {}) => {
    try {
        await CustomerLog.create({ customerPhone: phone, tenantId, branchId, actionType, details });
    } catch (e) {
        console.error('Failed to log customer activity:', e.message);
    }
};

// =========================
// Helper: Tenant Messages
// =========================
const getTenantMessage = (tenant, key, defaultMsg, placeholders = {}) => {
    let msg = tenant.whatsappSettings?.[key] || defaultMsg;
    for (const [pKey, pValue] of Object.entries(placeholders)) {
        msg = msg.replace(new RegExp(`{{${pKey}}}`, 'g'), pValue ?? '');
    }
    return msg;
};

// =========================
// Helper: Extract Incoming Text
// =========================
const extractTextFromMessage = (message) => {
    switch (message.type) {
        case 'text':
            return message.text?.body?.toLowerCase().trim() || '';

        case 'interactive': {
            const ia = message.interactive;
            if (ia?.button_reply) return ia.button_reply.id;
            if (ia?.list_reply) return ia.list_reply.id;
            if (ia?.nfm_reply) {
                try { return JSON.parse(ia.nfm_reply.response_json).id || ''; } catch { return ''; }
            }
            if (ia?.action?.button_reply) return ia.action.button_reply.id;
            return '';
        }

        case 'button':
            return message.button?.payload || '';

        case 'location': {
            const loc = message.location;
            return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
        }

        case 'order':
            return 'native_order';

        case 'audio':
        case 'voice':
            return `🎤 [Audio Message] (ID: ${message.audio?.id || message.voice?.id})`;

        default:
            return '';
    }
};

// =========================
// Helper: Reverse Geocoding
// =========================
const getAddressFromCoords = async (lat, lng, apiKey) => {
    if (!apiKey) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const res = await axios.get(url, { timeout: 5000 });
        console.log(`[Geocoding] Status: ${res.data.status}, Results: ${res.data.results?.length}`);
        if (res.data.status === 'OK' && res.data.results.length > 0) {
            return res.data.results[0].formatted_address;
        }
        if (res.data.status !== 'OK') {
            console.error(`[Geocoding] Error: ${res.data.error_message || 'Unknown'}`);
        }
        return null;
    } catch (e) {
        console.error('Reverse Geocoding Error:', e.message);
        return null;
    }
};

// =========================
// Helper: Build Payment Buttons
// Centralises which payment methods a tenant exposes.
// =========================
const buildPaymentButtons = (tenant) => {
    const buttons = [{ id: 'pay_cod', title: 'Cash on Delivery' }];
    if (tenant.razorpayKeyId || tenant.stripePublishableKey) {
        buttons.push({ id: 'pay_online', title: 'Online Payment' });
    }
    return buttons;
};

// =========================
// Helper: Address Selection Flow
// Shared between normal checkout and catalog checkout.
// =========================
const sendAddressSelectionOrRequest = async (from, session, tenant, { addressIdPrefix, newAddressId, nextState }) => {
    const addresses = await CustomerAddress.findAll({ where: { customerPhone: from } });

    if (addresses.length > 0) {
        session.state = nextState + '_SELECT';
        const rows = addresses.map(addr => ({
            id: `${addressIdPrefix}${addr.id}`,
            title: addr.label || 'Saved Address',
            description: (addr.formattedAddress || addr.address).substring(0, 72)
        }));
        rows.push({ id: newAddressId, title: '➕ Add New Address', description: 'Send location or type a new address' });

        const msgText = getTenantMessage(tenant, 'selectAddressMessage', 'Where should we deliver? Select a saved address or add a new one.');
        await sendListMessage(from, msgText, 'View Addresses', [{ title: 'Saved Addresses', rows }], session.config);
    } else {
        session.state = nextState;
        const msg = getTenantMessage(tenant, 'enterAddressMessage', '📍 Please share your location or type your delivery address');
        await sendLocationRequest(from, msg, session.config);
    }
};

// =========================
// Helper: Geocoding (Address to Coordinates)
// =========================
const getCoordsFromAddress = async (address, apiKey) => {
    if (!address) return null;

    // Extract coordinates directly if address is a Google Maps URL
    const mapsMatch = address.match(/maps\.google\.com\/\?q=(-?\d+\.\d+),(-?\d+\.\d+)/i) || 
                      address.match(/maps\.googleapis\.com\/maps\/api\/staticmap\?center=(-?\d+\.\d+),(-?\d+\.\d+)/i) ||
                      address.match(/google\.com\/maps\?q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (mapsMatch) {
        return {
            latitude: parseFloat(mapsMatch[1]),
            longitude: parseFloat(mapsMatch[2]),
            formattedAddress: null
        };
    }

    if (!apiKey) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const res = await axios.get(url, { timeout: 5000 });
        console.log(`[Geocoding Address] Status: ${res.data.status}`);
        if (res.data.status === 'OK' && res.data.results.length > 0) {
            const loc = res.data.results[0].geometry.location;
            return {
                latitude: loc.lat,
                longitude: loc.lng,
                formattedAddress: res.data.results[0].formatted_address
            };
        }
        if (res.data.status !== 'OK') {
            console.error(`[Geocoding Address] Error: ${res.data.error_message || 'Unknown'}`);
        }
        return null;
    } catch (e) {
        console.error('Geocoding Error:', e.message);
        return null;
    }
};

// =========================
// Helper: Calculate Haversine Distance (in km)
// =========================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// =========================
// Helper: Check Delivery Availability (Geofencing)
// =========================
const checkDeliveryAvailability = async (session, latitude, longitude) => {
    if (!session.branchId) return { available: true };
    const branch = await Branch.findByPk(session.branchId);
    if (!branch) return { available: true };
    
    if (branch.latitude == null || branch.longitude == null || branch.deliveryRadius == null) {
        return { available: true };
    }
    
    if (latitude == null || longitude == null) {
        return { available: true }; // Fail gracefully
    }
    
    const distance = calculateDistance(
        parseFloat(branch.latitude), 
        parseFloat(branch.longitude), 
        parseFloat(latitude), 
        parseFloat(longitude)
    );
    
    const inRange = distance <= parseFloat(branch.deliveryRadius);
    return {
        available: inRange,
        distance,
        deliveryRadius: branch.deliveryRadius,
        reason: inRange ? null : 'out_of_radius'
    };
};

// =========================
// Helper: Find Nearest Branch
// =========================
const findNearestBranch = async (tenantId, latitude, longitude) => {
    if (latitude == null || longitude == null) return null;
    try {
        const branches = await Branch.findAll({
            where: {
                tenantId,
                latitude: { [Op.not]: null },
                longitude: { [Op.not]: null }
            }
        });
        
        if (branches.length === 0) return null;
        
        let nearestBranch = null;
        let minDistance = Infinity;
        
        for (const branch of branches) {
            const dist = calculateDistance(
                parseFloat(branch.latitude),
                parseFloat(branch.longitude),
                parseFloat(latitude),
                parseFloat(longitude)
            );
            if (dist !== null && dist < minDistance) {
                minDistance = dist;
                nearestBranch = branch;
            }
        }
        
        return nearestBranch;
    } catch (e) {
        console.error('Error finding nearest branch:', e.message);
        return null;
    }
};

// =========================
// Helper: Save & Confirm Address
// =========================
const saveCustomerAddress = async (from, text, formattedAddress, latitude, longitude) => {
    try {
        await CustomerAddress.create({
            customerPhone: from,
            address: text,
            formattedAddress: formattedAddress || null,
            label: 'Saved Address',
            latitude: latitude || null,
            longitude: longitude || null
        });
    } catch (e) {
        console.error('Failed to save customer address:', e.message);
    }
};

// =========================
// Handler: Home Menu
// =========================
const handleHomeMenu = async (from, session, tenant, customer) => {
    session.state = 'START';
    session.categoryId = null;
    session.page = 1;

    const welcomeMsg = customer?.name
        ? getTenantMessage(tenant, 'welcomeReturning',
            `Welcome back to *{{tenant_name}}*, {{customer_name}}! 😊 We're so happy to see you again. Explore our latest collection and let us know if you need any help! 🛍️`,
            { tenant_name: tenant.name, customer_name: customer.name })
        : getTenantMessage(tenant, 'welcomeNew',
            `Welcome to *{{tenant_name}}*! 🛍️ We're excited to help you find precisely what you're looking for today. Feel free to browse our catalogs and reach out if you have any questions! ✨`,
            { tenant_name: tenant.name });

    // Send the welcome message first as a text message to guarantee it is received
    await sendTextMessage(from, welcomeMsg, session.config);

    let productsShown = false;
    let queryBranchId = session.branchId;
    if (!queryBranchId) {
        const firstBranch = await Branch.findOne({ where: { tenantId: tenant.id } });
        if (firstBranch) queryBranchId = firstBranch.id;
    }

    if (queryBranchId) {
        try {
            const products = await Product.findAll({
                where: { branchId: queryBranchId, stock: { [Op.or]: [{ [Op.gt]: 0 }, { [Op.eq]: null }] } },
                limit: 5,
                order: [['priority', 'ASC'], ['name', 'ASC']]
            });

            if (products.length > 0) {
                if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
                    const productItems = buildUniqueRetailerItems(products);
                    if (productItems.length > 0) {
                        const sections = [{ title: 'Our Featured Collection', product_items: productItems }];
                        await sendMultiProductMessage(from, session.catalogId, `🛍️ ${tenant.name}`, 'Check out our featured products below:', sections, session.config);
                        productsShown = true;
                    }
                } else {
                    productsShown = await sendProductsAsCarousel(from, products, 'Check out our featured products below:', session);
                }
            }
        } catch (e) {
            console.error('[HomeMenu] Error showing products:', e.response?.data || e.message);
        }
    }

    await sendListMessage(from, '🏠 Explore more options below:', 'Main Menu', [
        {
            title: '🛒 Shopping',
            rows: [
                { id: 'shop', title: 'Browse Store', description: 'View categories & products' },
                { id: 'all_products', title: 'All Products', description: 'View all items directly' },
                { id: 'search_mode', title: 'Search Products', description: 'Find something specific 🔍' }
            ]
        },
        {
            title: '📋 Account',
            rows: [
                { id: 'cart', title: 'View Cart', description: 'Check your items 🛒' },
                { id: 'track', title: 'Track Order', description: 'Check status 🚚' }
            ]
        },
        {
            title: '🆘 Help & Support',
            rows: [
                { id: 'support', title: 'Get Help', description: 'Chat with our support team' }
            ]
        }
    ], session.config);
};

// =========================
// Helper: Build retailer item list (deduped)
// =========================
const buildUniqueRetailerItems = (products) => {
    const seen = new Set();
    const items = [];
    for (const p of products) {
        if (p.retailerId && !seen.has(p.retailerId)) {
            seen.add(p.retailerId);
            items.push({ product_retailer_id: p.retailerId });
        }
    }
    return items;
};

// =========================
// Helper: Send products as carousel, returns bool
// =========================
const sendProductsAsCarousel = async (from, products, bodyText, session) => {
    if (products.length === 1) {
        await sendProductCardMessage(from, products[0], session.config);
    } else {
        const cards = products.map(p => ({
            image: p.image || 'https://via.placeholder.com/600x400?text=No+Image',
            title: p.name.slice(0, 32),
            buttons: [
                { id: `product_${p.id}`, title: 'View Details' },
                { id: `add_${p.id}`, title: `Add ₹${p.price}`.slice(0, 20) }
            ]
        }));
        await sendCarouselMessage(from, bodyText.slice(0, 1024), cards, session.config);
    }
    return true;
};

// =========================
// Handler: Support
// =========================
const handleSupport = async (from, session, tenant) => {
    const msg = getTenantMessage(tenant, 'supportMessage', '🆘 *Help & Support*\n\nIs your issue related to a specific order?');
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
        await sendTextMessage(from, 'No recent orders found. Please describe your issue below:', session.config);
        session.state = 'SUPPORT';
        session.supportOrderId = null;
        return;
    }

    const rows = recentOrders.map(o => {
        const emoji = { pending: '⏳', shipped: '🚚', delivered: '✅', cancelled: '❌' }[o.status] || '📦';
        return {
            id: `support_order_${o.id}`,
            title: `Order #${o.id} ${emoji}`,
            description: `₹${o.total} • ${new Date(o.createdAt).toLocaleDateString()}`
        };
    });

    await sendListMessage(from, 'Please select the order you need help with:', 'Select Order',
        [{ title: 'Recent Orders', rows }], session.config);
};

// =========================
// Handler: Track Order
// =========================
const handleTrackOrder = async (from, session) => {
    const recentOrders = await Order.findAll({
        where: { customerPhone: from },
        order: [['createdAt', 'DESC']],
        limit: 5
    });

    if (recentOrders.length === 0) {
        return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️",
            [{ id: 'shop', title: 'Shop Now' }], session.config);
    }
    if (recentOrders.length === 1) {
        return handleViewOrder(from, `view_order_${recentOrders[0].id}`, session);
    }

    const rows = recentOrders.map(o => {
        const emoji = { pending: '⏳', shipped: '🚚', delivered: '✅', cancelled: '❌' }[o.status] || '📦';
        return {
            id: `view_order_${o.id}`,
            title: `Order #${o.id} ${emoji}`,
            description: `₹${o.total} • ${new Date(o.createdAt).toLocaleDateString()}`
        };
    });

    await sendListMessage(from, 'Here are your most recent orders. Select one for details:',
        'Select Order', [{ title: 'Recent Orders', rows }], session.config);
};

const handleViewOrder = async (from, text, session) => {
    const orderId = text.replace('view_order_', '');
    const order = await Order.findByPk(orderId);

    if (!order || order.customerPhone !== from) {
        return await sendTextMessage(from, '❌ Order not found.', session.config);
    }

    const emoji = { pending: '⏳', shipped: '🚚', delivered: '✅', cancelled: '❌' }[order.status] || '📦';
    const trackingText = `📑 *Order Status*\nOrder #${order.id}\nStatus: ${order.status.toUpperCase()} ${emoji}\nTotal: ₹${order.total}\nPlaced: ${new Date(order.createdAt).toLocaleDateString()}`;

    const buttons = [{ id: 'menu', title: 'Back to Menu' }];
    if (order.status === 'delivered') {
        buttons.push({ id: `rate_${order.id}`, title: 'Rate Order ⭐' });
    } else {
        buttons.push({ id: 'shop', title: 'Shop More' });
    }

    const isWithinCancelWindow = (Date.now() - new Date(order.createdAt).getTime()) <= 5 * 60_000;
    if (order.status === 'pending' && isWithinCancelWindow) {
        buttons.push({ id: `cancel_order_${order.id}`, title: 'Cancel Order ❌' });
    }

    await sendButtonMessage(from, trackingText, buttons, session.config);
};

// =========================
// Handler: Cancel Order
// =========================
const handleCancelOrder = async (from, text, session) => {
    const orderId = text.replace('cancel_order_', '');
    const order = await Order.findByPk(orderId);

    if (!order) return await sendTextMessage(from, '❌ Order not found.', session.config);
    if (order.customerPhone !== from) return await sendTextMessage(from, '❌ Unauthorised request.', session.config);

    const isWithinWindow = (Date.now() - new Date(order.createdAt).getTime()) <= 5 * 60_000;
    if (order.status !== 'pending' || !isWithinWindow) {
        return await sendButtonMessage(from,
            '❌ Order cannot be cancelled. The cancellation window has passed or the order is already being processed.',
            [{ id: 'track', title: 'Track Order' }], session.config);
    }

    order.status = 'cancelled';
    await order.save();

    // Restock items in parallel
    if (Array.isArray(order.items)) {
        await Promise.allSettled(order.items.map(item =>
            Product.increment('stock', { by: item.quantity, where: { id: item.id } })
        ));
    }

    await sendButtonMessage(from, `✅ Order #${order.id} has been successfully cancelled.`,
        [{ id: 'shop', title: 'Shop Now' }], session.config);
};

// =========================
// Handler: Search
// =========================
const handleSearchMode = async (from, session, tenant) => {
    session.state = 'SEARCHING';
    const msg = getTenantMessage(tenant, 'searchProductsMessage',
        '🔍 *Product Search*\n\nType the name of the product you are looking for:');
    await sendTextMessage(from, msg, session.config);
};

const handleSearching = async (from, text, session, tenant) => {
    if (text === 'menu' || text === 'shop') {
        session.state = 'START';
        return 'RE_ROUTE';
    }

    session.state = 'SEARCHING';
    session.searchQuery = text;

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
                { branchId: session.branchId || { [Op.not]: null } },
                // Exclude out-of-stock items from search results
                { [Op.or]: [{ stock: { [Op.gt]: 0 } }, { stock: null }] }
            ]
        },
        order: [['priority', 'ASC'], ['name', 'ASC']],
        limit,
        offset: (page - 1) * limit
    });

    if (count === 0) {
        return await sendButtonMessage(from,
            `❌ No products found matching "*${text}*". Try another name or browse our categories.`,
            [{ id: 'search_mode', title: 'Search Again' }, { id: 'shop', title: 'Browse Store' }],
            session.config);
    }

    if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
        const productItems = buildUniqueRetailerItems(searchResults);
        const sections = [{ title: 'Search Results', product_items: productItems }];

        const optionRows = [];
        if (count > page * limit) optionRows.push({ id: `search_page_${page + 1}`, title: 'Next Page ➡️', description: `More results for "${text}"` });
        if (page > 1) optionRows.push({ id: `search_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });
        optionRows.push({ id: 'search_mode', title: '🔍 Search Again', description: 'Try a different keyword' });

        if (productItems.length === 1) {
            await sendProductCardMessage(from, searchResults[0], session.config);
        } else {
            await sendMultiProductMessage(from, session.catalogId, `🔍 Search: "${text}" (Page ${page})`, `Found ${count} matches`, sections, session.config);
        }
        if (optionRows.length > 0) {
            await sendListMessage(from, '⚙️ *Search Options*', 'Options', [{ title: 'Options', rows: optionRows }], session.config);
        }
    } else {
        await sendProductsAsCarousel(from, searchResults, `🔍 Search results for "*${text}*"`, session);
    }

    session.state = 'START';
};

// =========================
// Handler: Rating
// =========================
const handleRating = async (from, text, session) => {
    const orderId = text.replace('rate_', '');
    session.state = 'COLLECTING_FEEDBACK';
    session.pendingOrderId = orderId;
    await sendButtonMessage(from, 'How was your experience with this order? ⭐', [
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

// =========================
// Handler: Change Branch
// =========================
const handleChangeBranch = async (from, session, tenant) => {
    session.state = 'SELECTING_BRANCH';
    const branches = await Branch.findAll({ where: { tenantId: session.tenantId }, order: [['name', 'ASC']] });
    await sendListMessage(from,
        getTenantMessage(tenant, 'chooseBranchMessage', '📍 Choose your nearest branch'),
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(b => ({
                id: `branch_${b.id}`,
                title: b.name.slice(0, 24),
                description: b.address || 'Select branch'
            }))
        }],
        session.config);
};

// =========================
// Helper: Validate shop open
// =========================
const validateShopOpen = async (from, session) => {
    if (!session.branchId) return true;
    const branch = await Branch.findByPk(session.branchId);
    if (branch && !isBranchOpen(branch)) {
        await sendTextMessage(from,
            `Hi! 👋 Our shop is currently closed. We're open from *${format12Hour(branch.openingTime)}* to *${format12Hour(branch.closingTime)}*. Please visit us during working hours!`,
            session.config);
        return false;
    }
    return true;
};

// =========================
// Handler: Shop / Category Browser
// =========================
const handleShop = async (from, text, session, tenant, customer) => {
    if (text === 'shop' || text === 'change_category') {
        session.categoryId = null;
        session.page = 1;
    }

    // If a category is already scoped in session, show its products directly
    if (session.categoryId) {
        const category = await Category.findByPk(session.categoryId);
        if (category) return await renderCategoryProducts(from, category, session, tenant);
    }

    // Offer to continue with known branch
    if (customer?.branchId) {
        const branch = await Branch.findByPk(customer.branchId);
        if (branch) {
            return await sendButtonMessage(from,
                `Continue with *${branch.name}* or choose another? 📍`,
                [{ id: `branch_${branch.id}`, title: 'Continue' }, { id: 'change_branch', title: 'Change Branch' }],
                session.config);
        }
    }

    const branches = await Branch.findAll({ where: { tenantId: tenant.id }, order: [['name', 'ASC']] });

    if (branches.length === 0) {
        return await sendButtonMessage(from,
            `This store (${tenant.name}) doesn't have any branches set up yet. Please check back later! 🛍️`,
            [{ id: 'menu', title: 'Back to Menu' }], session.config);
    }

    if (branches.length === 1) {
        const branch = branches[0];
        session.state = 'SELECTING_CATEGORY';
        session.branchId = branch.id;
        if (!await validateShopOpen(from, session)) return;
        return await sendCategoryList(from, branch, session);
    }

    session.state = 'SELECTING_BRANCH';
    await sendListMessage(from,
        getTenantMessage(tenant, 'chooseBranchMessage', '📍 Choose your nearest branch'),
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(b => ({
                id: `branch_${b.id}`,
                title: b.name.slice(0, 24),
                description: b.address || 'Select branch'
            }))
        }],
        session.config);
};

// =========================
// Helper: Send category list for a branch
// =========================
const sendCategoryList = async (from, branch, session, page = 1) => {
    const limit = 10;
    const { count, rows: categories } = await Category.findAndCountAll({
        where: { branchId: branch.id },
        order: [['name', 'ASC']],
        limit,
        offset: (page - 1) * limit
    });

    if (count === 0) {
        return await sendTextMessage(from,
            `Welcome to ${branch.name}! 👋\n\nNo categories have been added yet. Please check back later! 🛍️`,
            session.config);
    }

    const rows = categories.map(c => ({
        id: `category_${c.id}`,
        title: c.name.slice(0, 24),
        description: c.description || 'Browse products'
    }));

    if (count > page * limit) rows.push({ id: `shop_page_${page + 1}`, title: 'Next Page ➡️', description: 'See more categories' });
    if (page > 1) rows.push({ id: `shop_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });

    await sendListMessage(from,
        `Welcome to ${branch.name}! 👋${page > 1 ? ` (Page ${page})` : ''}\n\nChoose a category below`,
        'View Categories',
        [{ title: '📂 Categories', rows }],
        session.config);
};

// =========================
// Helper: Render products for a category
// =========================
const renderCategoryProducts = async (from, category, session, tenant) => {
    const branchId = session.branchId || category.branchId;

    session.state = 'SELECTING_PRODUCT';
    session.categoryId = category.id;
    session.branchId = branchId;
    if (!session.page) session.page = 1;
    if (!session.sort) session.sort = 'name_ASC';

    const page = session.page;
    const limit = 10;
    const sort = session.sort;
    const orderAttr = sort === 'price_low' ? [['price', 'ASC']]
        : sort === 'price_high' ? [['price', 'DESC']]
            : [['name', 'ASC']];

    const { count, rows: catProducts } = await Product.findAndCountAll({
        where: { categoryId: category.id, branchId },
        order: [['priority', 'ASC'], ...orderAttr],
        limit,
        offset: (page - 1) * limit
    });

    if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
        const productItems = buildUniqueRetailerItems(catProducts);

        if (productItems.length === 0) {
            return await sendTextMessage(from, '🛍️ No products available in this category.', session.config);
        }
        if (productItems.length === 1) {
            await sendProductCardMessage(from, catProducts[0], session.config);
        } else {
            await sendMultiProductMessage(from, session.catalogId,
                `🛍️ ${category.name} Collection`, 'Choose a product below',
                [{ title: category.name.slice(0, 24), product_items: productItems }],
                session.config);
        }

        const optionRows = [];
        if (count > page * limit) optionRows.push({ id: `next_page_${category.id}`, title: 'Next Page ➡️', description: `View more in ${category.name}` });
        if (page > 1) optionRows.push({ id: `prev_page_${category.id}`, title: '⬅️ Previous Page', description: 'Go back' });
        optionRows.push({ id: `sort_toggle_${category.id}`, title: '🔃 Sort By Price', description: 'Switch between High/Low' });
        optionRows.push({ id: 'change_category', title: '📂 Change Category', description: 'Browse other collections' });
        optionRows.push({ id: 'menu', title: '🏠 Back to Home', description: 'Return to main menu' });
        await sendListMessage(from, '⚙️ *Shopping Options*', 'Options', [{ title: 'Options', rows: optionRows }], session.config);
    } else {
        await sendProductsAsCarousel(from, catProducts, `🛍️ *${category.name}* (Page ${page})`, session);
    }
};

// =========================
// Handler: All Products
// =========================
const handleAllProducts = async (from, session, tenant) => {
    if (!await validateShopOpen(from, session)) return;
    if (!session.branchId) return await handleChangeBranch(from, session, tenant);

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

    if (count === 0) return await sendTextMessage(from, '🛍️ No products available in this branch yet.', session.config);

    if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
        const productItems = buildUniqueRetailerItems(products);
        const sections = [{ title: `All Products (Page ${page})`, product_items: productItems }];
        await sendMultiProductMessage(from, session.catalogId, '🛍️ Our Collection', 'Browse all items below', sections, session.config);

        const optionRows = [];
        if (count > page * limit) optionRows.push({ id: `all_products_page_${page + 1}`, title: 'Next Page ➡️', description: 'See more products' });
        if (page > 1) optionRows.push({ id: `all_products_page_${page - 1}`, title: '⬅️ Previous Page', description: 'Go back' });
        optionRows.push({ id: 'change_category', title: '📂 Browse Categories', description: 'Switch to category view' });
        optionRows.push({ id: 'menu', title: '🏠 Back to Home', description: 'Return to main menu' });
        await sendListMessage(from, '⚙️ *Shopping Options*', 'Options', [{ title: 'Options', rows: optionRows }], session.config);
    } else {
        await sendProductsAsCarousel(from, products, `🛍️ *All Products* (Page ${page})`, session);
    }
};

// =========================
// Handler: Branch Selection
// =========================
const handleBranchSelection = async (from, text, session) => {
    console.log(`[Flow] Branch selection for ${from}: ${text}`);
    const branchId = text.replace('branch_', '');
    const branch = await Branch.findByPk(branchId);
    if (!branch) return await sendTextMessage(from, '❌ Branch not found. Please try again.', session.config);

    session.branchId = branch.id;
    session.categoryId = null;
    session.page = 1;

    if (!await validateShopOpen(from, session)) return;

    Customer.update({ branchId: branch.id }, { where: { phone: from } }).catch(e =>
        console.error('Failed to update customer branch:', e.message));

    if (session.intent === 'view_all') {
        session.intent = null;
        const tenant = await Tenant.findByPk(session.tenantId);
        return await handleAllProducts(from, session, tenant);
    }

    session.state = 'SELECTING_CATEGORY';
    await sendCategoryList(from, branch, session, session.page || 1);
};

// =========================
// Handler: Category Selection
// =========================
const handleCategorySelection = async (from, text, session, tenant) => {
    if (!await validateShopOpen(from, session)) return;
    const categoryId = text.replace('category_', '');
    const category = await Category.findByPk(categoryId);

    if (!category) return await sendTextMessage(from, 'Invalid category ❌', session.config);

    const branchId = session.branchId || category.branchId;
    await logCustomerActivity(from, session.tenantId, branchId, 'CATEGORY_VIEWED',
        { categoryId: category.id, categoryName: category.name });

    session.state = 'SELECTING_PRODUCT';
    session.categoryId = category.id;
    session.branchId = branchId;
    if (!session.page) session.page = 1;
    if (!session.sort) session.sort = 'name_ASC';

    const page = session.page;
    const limit = 10;
    const sort = session.sort;
    const orderAttr = sort === 'price_low' ? [['price', 'ASC']]
        : sort === 'price_high' ? [['price', 'DESC']]
            : [['name', 'ASC']];

    const { count, rows: catProducts } = await Product.findAndCountAll({
        where: { categoryId: category.id, branchId },
        order: [['priority', 'ASC'], ...orderAttr],
        limit,
        offset: (page - 1) * limit
    });

    console.log(`[DEBUG] Category Selection - Catalog ID: ${session.catalogId}`);

    if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
        const productItems = buildUniqueRetailerItems(catProducts);

        if (productItems.length === 0) {
            await sendTextMessage(from, '🛍️ No products available in this category yet.', session.config);
        } else if (productItems.length === 1) {
            await sendProductCardMessage(from, catProducts.find(p => p.retailerId === productItems[0].product_retailer_id), session.config);
        } else {
            console.log(`[DEBUG] Sending MPM for category: ${category.name}`, JSON.stringify(productItems));
            await sendMultiProductMessage(from, session.catalogId, `🛍️ ${category.name}`, 'Choose a product below',
                [{ title: `${category.name} Collection`.slice(0, 24), product_items: productItems }],
                session.config);
        }

        const optionRows = [];
        if (count > page * limit) optionRows.push({ id: `next_page_${category.id}`, title: 'Next Page ➡️', description: `View more in ${category.name}` });
        if (page > 1) optionRows.push({ id: `prev_page_${category.id}`, title: '⬅️ Previous Page', description: 'Go back' });
        optionRows.push({ id: `sort_toggle_${category.id}`, title: '🔃 Sort By Price', description: 'Switch between High/Low' });
        optionRows.push({ id: 'change_category', title: '📂 Change Category', description: 'Browse other collections' });
        optionRows.push({ id: 'menu', title: '🏠 Back to Home', description: 'Return to main menu' });
        await sendListMessage(from, '⚙️ *Shopping Options*', 'Options', [{ title: 'Options', rows: optionRows }], session.config);
    } else {
        await sendProductsAsCarousel(from, catProducts, `🛍️ *${category.name}*`, session);
    }
};

// =========================
// Handler: Pagination & Sorting
// =========================
const handlePaginationAndSorting = async (from, text, session) => {
    if (text.startsWith('next_page_')) {
        session.page = (session.page || 1) + 1;
        return `category_${text.replace('next_page_', '')}`;
    }
    if (text.startsWith('prev_page_')) {
        session.page = Math.max(1, (session.page || 1) - 1);
        return `category_${text.replace('prev_page_', '')}`;
    }
    if (text.startsWith('sort_toggle_')) {
        const categoryId = text.replace('sort_toggle_', '');
        await sendButtonMessage(from, '🔃 *Sort Products*\n\nHow would you like to view items?', [
            { id: `sort_low_${categoryId}`, title: 'Price: Low to High' },
            { id: `sort_high_${categoryId}`, title: 'Price: High to Low' },
            { id: `sort_name_${categoryId}`, title: 'Name: A-Z' }
        ], session.config);
        return null;
    }
    if (text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
        const categoryId = text.split('_').pop();
        session.sort = text.startsWith('sort_low') ? 'price_low'
            : text.startsWith('sort_high') ? 'price_high'
                : 'name_ASC';
        session.page = 1;
        return `category_${categoryId}`;
    }
    return null;
};

// =========================
// Handler: Product View
// =========================
const handleProductSelection = async (from, text, session, tenant) => {
    const productId = text.replace('product_', '');
    const selectedProduct = await Product.findByPk(productId);

    if (!selectedProduct) return await sendTextMessage(from, 'Invalid product ❌', session.config);

    await logCustomerActivity(from, session.tenantId, session.branchId || selectedProduct.branchId, 'PRODUCT_VIEWED',
        { productId: selectedProduct.id, productName: selectedProduct.name });
    session.state = 'VIEWING_PRODUCT';
    session.productId = selectedProduct.id;

    if (session.catalogId && tenant.displayMode !== 'carousel' && tenant.displayMode !== 'list') {
        await sendSingleProductMessage(from, session.catalogId, selectedProduct.retailerId,
            `🔥 ${selectedProduct.name}`, 'Friska 🛍️', session.config);
    } else {
        await sendProductCardMessage(from, selectedProduct, session.config);
    }
};

// =========================
// Handler: Add to Cart
// =========================
const handleAddToCart = async (from, text, session) => {
    console.log(`[Flow] Add to cart for ${from}: ${text}`);
    const isBuy = text.startsWith('buy_');
    const productId = isBuy ? text.replace('buy_', '') : text.replace('add_', '');
    const product = await Product.findByPk(productId);

    if (!product) return await sendTextMessage(from, '❌ Product not found.', session.config);

    // Immediate out-of-stock check
    if (product.stock !== null && product.stock <= 0) {
        return await sendTextMessage(from, `❌ Sorry, *${product.name}* is currently out of stock.`, session.config);
    }

    await logCustomerActivity(from, session.tenantId, session.branchId || product.branchId, 'ADDED_TO_CART',
        { productId: product.id, productName: product.name });
    session.state = 'COLLECTING_QUANTITY';
    session.pendingAction = isBuy ? 'buy' : 'add';
    session.pendingProductId = product.id;
    await sendTextMessage(from, `🔢 How many *${product.name}* would you like? (Enter a number)`, session.config);
};

// =========================
// Handler: Quantity Selection
// =========================
const handleQuantitySelection = async (from, text, session) => {
    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty <= 0) {
        return await sendTextMessage(from, '❌ Invalid quantity. Please enter a number (e.g. 1, 2, 5).', session.config);
    }

    const product = await Product.findByPk(session.pendingProductId);
    if (!product) return await sendTextMessage(from, '❌ Product not found.', session.config);

    const action = session.pendingAction;
    const existingInCart = carts[from]?.find(it => it.id === product.id)?.quantity || 0;
    const totalRequested = (action === 'add' ? existingInCart : 0) + qty;

    if (product.stock !== null && product.stock <= 0) {
        return await sendTextMessage(from, `❌ Sorry, *${product.name}* is currently out of stock.`, session.config);
    }
    if (product.stock !== null && totalRequested > product.stock) {
        const available = product.stock - (action === 'add' ? existingInCart : 0);
        if (available <= 0) {
            return await sendTextMessage(from,
                `⚠️ You already have the maximum available stock (*${product.stock}*) of *${product.name}* in your cart.`,
                session.config);
        }
        return await sendTextMessage(from,
            `⚠️ Only *${product.stock}* units of *${product.name}* are available.${action === 'add' && existingInCart > 0 ? ` You already have *${existingInCart}* in your cart.` : ''} Please enter *${available}* or less.`,
            session.config);
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
        // Buy Now — replace cart, skip to address
        carts[from] = [{ id: product.id, name: product.name, price: product.price, quantity: qty }];
        session.state = 'CHECKOUT_ADDRESS';
        await sendLocationRequest(from, `📍 Enter delivery address for ${qty}x ${product.name}`, session.config);
    }
};

// =========================
// Handler: View Cart
// =========================
const handleCart = async (from, session, tenant) => {
    console.log(`[Flow] Cart viewed for ${from}`);
    const userCart = carts[from] || [];

    if (userCart.length === 0) {
        return await sendButtonMessage(from,
            getTenantMessage(tenant, 'cartEmptyMessage', '🛒 Your cart is empty'),
            [{ id: 'shop', title: 'Shop' }], session.config);
    }

    let subtotal = 0;
    const cartItemsText = userCart.map(item => {
        subtotal += item.price * item.quantity;
        return `• ${item.name} x${item.quantity} — ₹${item.price * item.quantity}`;
    }).join('\n');

    const bestOffer = await calculateBestOffer(from, session.branchId, subtotal, session.tenantId);
    let total = subtotal;
    let offerText = '';

    if (bestOffer) {
        total = subtotal - bestOffer.calculatedDiscount;
        offerText = `\n\n🎁 *Offer Applied: ${bestOffer.code}*\nDiscount: -₹${bestOffer.calculatedDiscount}${bestOffer.discountType === 'percentage' ? ` (${bestOffer.discountValue}%)` : ''}`;
    }

    await sendButtonMessage(from,
        `🛒 Your Cart\n\n${cartItemsText}\n\n💰 Subtotal: ₹${subtotal}${offerText}\n\n✅ *Final Total: ₹${total}*`,
        [{ id: 'shop', title: 'Shop More' }, { id: 'checkout', title: 'Checkout' }],
        session.config);
};

// =========================
// Helper: Stock check before checkout
// =========================
const checkCartStock = async (userCart) => {
    for (const item of userCart) {
        const product = await Product.findByPk(item.id);
        if (!product) return `❌ Product *${item.name}* is no longer available.`;
        if (product.stock !== null && product.stock < item.quantity) {
            return product.stock <= 0
                ? `❌ Sorry, *${product.name}* just went out of stock.`
                : `❌ Sorry, only *${product.stock}* units of *${product.name}* are available now.`;
        }
    }
    return null;
};

// =========================
// Handler: Checkout
// =========================
const handleCheckout = async (from, session, tenant) => {
    const userCart = carts[from] || [];
    if (userCart.length === 0) {
        return await sendButtonMessage(from,
            getTenantMessage(tenant, 'cartEmptyMessage', '🛒 Cart is empty'),
            [{ id: 'shop', title: 'Shop' }], session.config);
    }

    const stockError = await checkCartStock(userCart);
    if (stockError) {
        return await sendButtonMessage(from,
            `${stockError}\n\nPlease update your cart before proceeding.`,
            [{ id: 'cart', title: '🛒 View Cart' }, { id: 'menu', title: '🏠 Back to Menu' }],
            session.config);
    }

    await sendAddressSelectionOrRequest(from, session, tenant, {
        addressIdPrefix: 'address_',
        newAddressId: 'address_new',
        nextState: 'CHECKOUT_ADDRESS'
    });
};

// =========================
// Handler: Address Collection
// =========================
const handleAddressCollection = async (from, text, session, tenant) => {
    let lat = session.latitude;
    let lng = session.longitude;
    let formattedAddress = session.formattedAddress;

    if (lat == null || lng == null) {
        const geo = await getCoordsFromAddress(text, tenant.googleMapsApiKey);
        if (geo) {
            lat = geo.latitude;
            lng = geo.longitude;
            formattedAddress = geo.formattedAddress;
        }
    }

    if (!session.branchId && lat != null && lng != null) {
        const nearest = await findNearestBranch(tenant.id, lat, lng);
        if (nearest) {
            session.branchId = nearest.id;
            console.log(`[Geofencing] Resolved session.branchId to nearest branch #${nearest.id} (${nearest.name})`);
        }
    }

    const availability = await checkDeliveryAvailability(session, lat, lng);
    if (!availability.available) {
        const limitKm = availability.deliveryRadius;
        await sendTextMessage(from, `❌ Sorry, we do not deliver to this location as it is outside our delivery radius of ${limitKm} km. Please send/type a different delivery address.`, session.config);
        return;
    }

    session.latitude = lat;
    session.longitude = lng;
    session.formattedAddress = formattedAddress;
    session.address = text;

    await saveCustomerAddress(from, text, formattedAddress, lat, lng);
    session.state = 'CHECKOUT_PAYMENT';

    const msg = getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?');
    await sendButtonMessage(from, msg, buildPaymentButtons(tenant), session.config);
};

// =========================
// Handler: Payment Selection
// =========================
const handlePaymentSelection = async (from, text, session, tenant) => {
    const paymentMethod = text === 'pay_cod' ? 'Cash on Delivery' : 'Online Payment';
    const address = session.address || 'N/A';

    let userCart = carts[from] || [];
    let isCatalogOrder = false;

    if (userCart.length === 0 && session.lastCatalogOrder) {
        isCatalogOrder = true;
        userCart = [{ name: 'Catalog Order', price: 0, quantity: 1, isCatalog: true, description: session.lastCatalogOrder }];
    }

    if (userCart.length === 0) {
        return await sendButtonMessage(from, '🛒 Your cart is empty.', [{ id: 'menu', title: 'Back to Menu' }], session.config);
    }

    if (!isCatalogOrder) {
        const stockError = await checkCartStock(userCart);
        if (stockError) {
            return await sendButtonMessage(from,
                `${stockError}\n\nSomeone else just grabbed the last items! Please update your cart.`,
                [{ id: 'cart', title: '🛒 View Cart' }, { id: 'menu', title: '🏠 Back to Menu' }],
                session.config);
        }
    }

    let subtotal = 0;
    if (isCatalogOrder) {
        const match = session.lastCatalogOrder.match(/total amount:?\s*₹?\s*([\d,]+(\.\d+)?)/i);
        const amountStr = match ? match[1].replace(/,/g, '') : '0';
        subtotal = parseFloat(amountStr) || 0;
        userCart[0].price = subtotal;
        console.log(`[Catalog Order] Extracted amount: ${subtotal}`);
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

    // Ensure total is never negative
    total = Math.max(0, total);

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
        console.error('Order save error:', e.message);
        return await sendTextMessage(from,
            '⚠️ There was an issue placing your order. Please try again or contact support.',
            session.config);
    }

    if (savedOrder) await orderService.handleOrderSuccess(savedOrder);

    // Clear cart & session state
    carts[from] = [];
    session.state = 'ORDER_CONFIRMED';
    delete session.address;
    delete session.formattedAddress;
    delete session.lastCatalogOrder;

    // Notify tenant (non-blocking)
    if (savedOrder && session.tenantId) {
        notificationService.sendToTenant(
            session.tenantId,
            `🛒 New Order #${savedOrder.id}`,
            `₹${total} from +${from} (${paymentMethod})`,
            'new_order',
            { orderId: savedOrder.id, total, customerPhone: from, branchId: session.branchId }
        ).catch(err => console.error('[FCM error]', err.message));
    }

    if (paymentMethod === 'Online Payment' && savedOrder) {
        try {
            const tenantObj = await Tenant.findByPk(session.tenantId);
            const paymentLink = await createPaymentLink(savedOrder, tenantObj);
            await sendTextMessage(from,
                `🔗 *Payment Link Generated*\n\nPlease complete your payment of *₹${total}* using the link below:\n\n${paymentLink.short_url}\n\n*Note:* Your order will be confirmed once payment is received.`,
                session.config);
        } catch (payError) {
            console.error('Payment Link Error:', payError.message);
            await sendTextMessage(from,
                '⚠️ We encountered an issue generating your payment link. Please try again or contact support.',
                session.config);
        }
    } else {
        let msg = getTenantMessage(tenant, 'orderConfirmedMessage',
            `✅ *Order Confirmed!* #{{order_id}}\n\nYour order has been placed successfully via *{{payment_method}}*.\n\nThank you for shopping with us! 🛍️`,
            { payment_method: paymentMethod, order_id: savedOrder?.id });

        if (!msg.includes('₹')) {
            const subtotalDisplay = (savedOrder.total + savedOrder.discountAmount).toFixed(2);
            const offerLine = savedOrder.appliedOfferCode
                ? `Offer (${savedOrder.appliedOfferCode}): -₹${savedOrder.discountAmount.toFixed(2)}\n` : '';
            msg += `\n\n💰 *Order Summary:*\nSubtotal: ₹${subtotalDisplay}\n${offerLine}*Final Total: ₹${savedOrder.total.toFixed(2)}*`;
        }

        await sendTextMessage(from, msg, session.config);
    }

    await sendButtonMessage(from, 'What would you like to do next?',
        [{ id: 'track', title: 'Track Order 🚚' }, { id: 'menu', title: 'Main Menu 🏠' }],
        session.config);
};

// =========================
// Handler: Native WhatsApp Catalog Order
// =========================
const handleNativeOrder = async (from, message, session, tenant) => {
    const productItems = message.order?.product_items;
    if (!productItems || productItems.length === 0) return;

    const newCart = [];
    const missingItems = [];

    for (const item of productItems) {
        const product = await Product.findOne({
            where: {
                retailerId: item.product_retailer_id,
                branchId: session.branchId || { [Op.not]: null }
            }
        });
        if (product) {
            newCart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(item.item_price),
                quantity: parseInt(item.quantity, 10)
            });
        } else {
            missingItems.push(item.product_retailer_id);
        }
    }

    if (missingItems.length > 0) {
        console.warn(`[NativeOrder] Could not resolve retailer IDs: ${missingItems.join(', ')}`);
    }

    if (newCart.length > 0) {
        carts[from] = newCart;
        session.state = 'CHECKOUT_ADDRESS';
        await sendLocationRequest(from,
            '📍 We received your cart! Please share your delivery address to confirm your order.',
            session.config);
    } else {
        await sendTextMessage(from,
            '❌ There was an error processing your cart. Products may be out of stock or unavailable.',
            session.config);
    }
};

// =========================
// Handler: Default / Fallback
// =========================
const handleDefault = async (from, text, session, tenant) => {
    // Audio/media messages
    if (text.includes('[Audio Message]')) {
        await logCustomerActivity(from, tenant.id, session.branchId, 'SUPPORT_REQUEST',
            { message: text, autoGenerated: true });
        notificationService.sendToTenant(
            tenant.id, '🆘 New Audio Support Request',
            `From +${from}: ${text.split(' (ID:')[0]}`,
            'support_request',
            { customerPhone: from, message: text, branchId: session.branchId }
        ).catch(err => console.error('[FCM error]', err.message));

        await sendButtonMessage(from,
            '🎧 *Audio Received*\n\nWe received your audio message and have forwarded it to our support team! 🆘',
            [{ id: 'shop', title: 'Shop' }, { id: 'cart', title: 'Cart' }, { id: 'track', title: 'Track Order' }],
            session.config);
        return;
    }

    // AI response for plain conversational text (not button payloads)
    if (text && text.length > 2 && !text.includes('_')) {
        try {
            const aiReply = await aiService.generateSupportResponse(tenant, session, text);
            if (aiReply) {
                await sendTextMessage(from, aiReply, session.config);
                return;
            }
        } catch (e) {
            console.error('[AI] generateSupportResponse error:', e.message);
        }
    }

    // Final fallback
    await sendButtonMessage(from, 'Choose an option 👇',
        [{ id: 'shop', title: 'Shop' }, { id: 'cart', title: 'Cart' }, { id: 'track', title: 'Track Order' }],
        session.config);
};

// =========================
// Main Webhook Controller
// =========================
const receiveWebhook = async (req, res) => {
    // Acknowledge immediately — WhatsApp requires a fast 200
    res.sendStatus(200);

    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const metadata = change?.value?.metadata;
        const message = change?.value?.messages?.[0];
        const statuses = change?.value?.statuses?.[0];

        if (statuses) {
            console.log(`[Webhook Status] Status Update for message ${statuses.id} to ${statuses.recipient_id} | status: ${statuses.status}`);
            if (statuses.status === 'failed' && statuses.errors) {
                console.error(`[Webhook Status ERROR] Message delivery failed:`, JSON.stringify(statuses.errors, null, 2));
            }
            return;
        }

        if (!message || !metadata) return;

        const from = message.from;
        const msgId = message.id;
        const phoneNumberId = metadata.phone_number_id;
        const profileName = change?.value?.contacts?.[0]?.profile?.name || '';

        console.log(`[Webhook] Incoming from ${from} via ${phoneNumberId} | msg: ${msgId}`);

        // ── Deduplication ──────────────────────────────────────────────
        if (isDuplicateMessage(from, msgId)) {
            console.log(`[Webhook] Duplicate message ${msgId} from ${from} — skipped`);
            return;
        }

        // ── Rate Limiting ─────────────────────────────────────────────
        if (isRateLimited(from)) {
            console.log(`[RateLimit] Message from ${from} dropped`);
            return;
        }

        // ── Tenant Lookup ─────────────────────────────────────────────
        const tenant = await Tenant.findOne({ where: { phoneNumberId, isActive: true } });
        if (!tenant) {
            console.error(`[Webhook] No active tenant for phoneNumberId: ${phoneNumberId}`);
            try {
                await sendTextMessage(from,
                    '⚠️ This WhatsApp number is not yet fully configured. Please contact support. 🛍️',
                    { phoneNumberId, whatsappToken: process.env.WHATSAPP_TOKEN });
            } catch (e) {
                console.error('Failed to send fallback error message:', e.message);
            }
            return;
        }

        const tenantConfig = {
            phoneNumberId: tenant.phoneNumberId,
            whatsappToken: tenant.whatsappToken,
            displayMode: tenant.displayMode || 'catalog'
        };

        // Typing indicator (non-blocking)
        sendTypingIndicator(from, tenantConfig).catch(() => { });

        // ── Branch & Customer Resolution ──────────────────────────────
        const tenantBranchIds = (await Branch.findAll({
            where: { tenantId: tenant.id }, attributes: ['id']
        })).map(b => b.id);

        const customer = await Customer.findOne({
            where: {
                phone: from,
                branchId: { [Op.or]: [{ [Op.in]: tenantBranchIds }, { [Op.eq]: null }] }
            }
        });

        const autoBranchId = tenantBranchIds.length === 1 ? tenantBranchIds[0] : null;

        // ── Session Bootstrap / Refresh ───────────────────────────────
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
            Object.assign(sessions[from], {
                tenantId: tenant.id,
                config: tenantConfig,
                catalogId: tenant.catalogId,
                lastInteraction: new Date()
            });
            if (!sessions[from].branchId) {
                sessions[from].branchId = customer?.branchId || autoBranchId;
            }
        }

        const session = sessions[from];

        // ── Upsert Customer Record ────────────────────────────────────
        Customer.upsert({
            phone: from,
            name: profileName || customer?.name || '',
            lastInteraction: new Date(),
            branchId: session.branchId || null
        }).catch(e => console.error('Customer upsert error:', e.message));

        // ── Extract Text ──────────────────────────────────────────────
        let text = extractTextFromMessage(message);

        // ── Reverse Geocoding & Coordinate Storing ────────────────────
        if (message.type === 'location') {
            session.latitude = message.location.latitude;
            session.longitude = message.location.longitude;
            console.log(`[Geocoding] API key present: ${!!tenant.googleMapsApiKey}`);
            if (tenant.googleMapsApiKey) {
                const resolved = await getAddressFromCoords(
                    message.location.latitude, message.location.longitude, tenant.googleMapsApiKey);
                if (resolved) {
                    console.log(`[Geocoding] Resolved: ${resolved}`);
                    session.formattedAddress = resolved;
                }
            }
        } else if (message.type === 'text') {
            session.latitude = null;
            session.longitude = null;
            session.formattedAddress = null;
        }

        console.log(`FROM: ${from} | STATE: ${session.state} | TEXT: ${text}`);

        // =============================================================
        // ROUTING TABLE
        // Ordered from most specific to most general.
        // =============================================================

        // ── Visual Catalog Order ──────────────────────────────────────
        if (text.includes('new order from visual catalog')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT', { type: 'visual_catalog' });
            session.lastCatalogOrder = text;

            await sendAddressSelectionOrRequest(from, session, tenant, {
                addressIdPrefix: 'cataddress_',
                newAddressId: 'cataddress_new',
                nextState: 'CATALOG_ORDER_ADDRESS'
            });

            // If no saved addresses, also notify merchant
            const hasAddresses = (await CustomerAddress.count({ where: { customerPhone: from } })) > 0;
            if (!hasAddresses) {
                notificationService.sendToTenant(
                    tenant.id, '🛍️ New Catalog Order',
                    `From +${from}: A customer placed a Visual Catalog order. Awaiting address...`,
                    'new_order',
                    { customerPhone: from, type: 'visual_catalog', branchId: session.branchId }
                ).catch(err => console.error('[FCM error]', err.message));
            }
            return;
        }

        // ── Catalog Order: Address Provided ───────────────────────────
        if (session.state === 'CATALOG_ORDER_ADDRESS') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'ADDRESS_PROVIDED', { address: text });
            
            let lat = session.latitude;
            let lng = session.longitude;
            let formattedAddress = session.formattedAddress;

            if (lat == null || lng == null) {
                const geo = await getCoordsFromAddress(text, tenant.googleMapsApiKey);
                if (geo) {
                    lat = geo.latitude;
                    lng = geo.longitude;
                    formattedAddress = geo.formattedAddress;
                }
            }

            if (!session.branchId && lat != null && lng != null) {
                const nearest = await findNearestBranch(tenant.id, lat, lng);
                if (nearest) {
                    session.branchId = nearest.id;
                    console.log(`[Geofencing] Resolved session.branchId to nearest branch #${nearest.id} (${nearest.name})`);
                }
            }

            const availability = await checkDeliveryAvailability(session, lat, lng);
            if (!availability.available) {
                const limitKm = availability.deliveryRadius;
                await sendTextMessage(from, `❌ Sorry, we do not deliver to this location as it is outside our delivery radius of ${limitKm} km. Please send/type a different delivery address.`, session.config);
                return;
            }

            session.latitude = lat;
            session.longitude = lng;
            session.formattedAddress = formattedAddress;
            session.address = text;

            await saveCustomerAddress(from, text, formattedAddress, lat, lng);
            
            notificationService.sendToTenant(
                tenant.id, '📍 Address Received',
                `Customer (+${from}) address: ${text}`,
                'address_update',
                { customerPhone: from, address: text, branchId: session.branchId }
            ).catch(err => console.error('[FCM error]', err.message));

            session.state = 'CHECKOUT_PAYMENT';
            await sendButtonMessage(from,
                getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?'),
                buildPaymentButtons(tenant),
                session.config);
            return;
        }

        // ── Global "Menu" shortcuts that should work from any state ───
        const defaultTriggers = ['hi', 'hello', 'start', 'menu', 'hey', 'hii', 'hai', 'helo', 'hola', 'yo'];
        const customTriggersRaw = tenant.whatsappSettings?.menuTriggers || '';
        const customTriggers = customTriggersRaw
            ? customTriggersRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
            : [];
        const menuTriggers = [...new Set([...defaultTriggers, ...customTriggers])];

        // Strip punctuation and lowercase for flexible matching (e.g. "Hello!" or "Hi.")
        const normalizedText = text.replace(/[!.,?]/g, '').trim().toLowerCase();

        if (menuTriggers.includes(normalizedText)) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'MENU_VIEWED');
            return await handleHomeMenu(from, session, tenant, customer);
        }

        // ── Specific Commands ─────────────────────────────────────────
        if (text === 'native_order') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT', { type: 'native_order' });
            return await handleNativeOrder(from, message, session, tenant);
        }
        if (text === 'track' || text === 'status') return await handleTrackOrder(from, session);
        if (text.startsWith('view_order_')) return await handleViewOrder(from, text, session);
        if (text.startsWith('rate_')) return await handleRating(from, text, session);
        if (session.state === 'COLLECTING_FEEDBACK') return await handleCollectingFeedback(from, text, session);
        if (text === 'search_mode') return await handleSearchMode(from, session, tenant);
        if (session.state === 'SEARCHING') {
            const reroute = await handleSearching(from, text, session, tenant);
            if (reroute === 'RE_ROUTE') return await handleHomeMenu(from, session, tenant, customer);
            return;
        }
        if (text === 'support') return await handleSupport(from, session, tenant);
        if (text === 'support_order_yes') return await handleSupportOrderList(from, session);
        if (text === 'support_order_no') {
            session.state = 'SUPPORT';
            session.supportOrderId = null;
            return await sendTextMessage(from, 'Please describe your issue below:', session.config);
        }
        if (text.startsWith('support_order_')) {
            const orderId = text.replace('support_order_', '');
            session.supportOrderId = orderId;
            session.state = 'SUPPORT';
            return await sendTextMessage(from,
                `Issue related to *Order #${orderId}*.\n\nPlease describe the problem:`, session.config);
        }
        if (session.state === 'SUPPORT') {
            let logBranchId = session.branchId;
            if (session.supportOrderId) {
                const order = await Order.findByPk(session.supportOrderId);
                if (order) logBranchId = order.branchId;
            }
            await logCustomerActivity(from, tenant.id, logBranchId, 'SUPPORT_REQUEST',
                { message: text, orderId: session.supportOrderId || null });

            const capturedOrderId = session.supportOrderId;
            session.state = 'START';
            session.supportOrderId = null;

            notificationService.sendToTenant(
                tenant.id, '🆘 New Support Request',
                `From +${from}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`,
                'support_request',
                { customerPhone: from, message: text, orderId: capturedOrderId || null, branchId: logBranchId }
            ).catch(err => console.error('[FCM error]', err.message));

            return await sendButtonMessage(from,
                '✅ *Message Received!*\n\nThank you for reaching out. Our support team will contact you shortly.',
                [{ id: 'menu', title: 'Back to Menu' }], session.config);
        }
        if (text === 'shop' || text === 'change_category') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'SHOP_VIEWED');
            return await handleShop(from, text, session, tenant, customer);
        }
        if (text === 'all_products') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'SHOP_VIEWED', { mode: 'all_products' });
            session.intent = 'view_all';
            session.page = 1;
            return await handleAllProducts(from, session, tenant);
        }
        if (text.startsWith('all_products_page_')) {
            session.page = parseInt(text.replace('all_products_page_', ''), 10);
            return await handleAllProducts(from, session, tenant);
        }
        if (text.startsWith('cancel_order_')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'ORDER_CANCELLED');
            return await handleCancelOrder(from, text, session);
        }
        if (text === 'change_branch') return await handleChangeBranch(from, session, tenant);
        if (text.startsWith('branch_')) return await handleBranchSelection(from, text, session);
        if (['next_page_', 'prev_page_', 'sort_toggle_', 'sort_low_', 'sort_high_', 'sort_name_'].some(p => text.startsWith(p))) {
            const nextText = await handlePaginationAndSorting(from, text, session);
            if (nextText) return await handleCategorySelection(from, nextText, session, tenant);
            return;
        }
        if (text.startsWith('shop_page_')) {
            session.page = parseInt(text.replace('shop_page_', ''), 10);
            return await handleShop(from, 'shop', session, tenant, customer);
        }
        if (text.startsWith('search_page_')) {
            session.page = parseInt(text.replace('search_page_', ''), 10);
            if (session.searchQuery) return await handleSearching(from, session.searchQuery, session, tenant);
            return await handleHomeMenu(from, session, tenant, customer);
        }
        if (text.startsWith('category_')) return await handleCategorySelection(from, text, session, tenant);
        if (text.startsWith('product_')) return await handleProductSelection(from, text, session, tenant);
        if (text.startsWith('add_') || text.startsWith('buy_')) return await handleAddToCart(from, text, session);
        if (session.state === 'COLLECTING_QUANTITY') return await handleQuantitySelection(from, text, session);
        if (text === 'cart') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CART_VIEWED');
            return await handleCart(from, session, tenant);
        }
        if (text === 'checkout') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT_STARTED');
            return await handleCheckout(from, session, tenant);
        }

        // ── Address Selection Flows ────────────────────────────────────
        if (session.state === 'CHECKOUT_ADDRESS_SELECT') {
            if (text === 'address_new') {
                session.state = 'CHECKOUT_ADDRESS';
                await sendLocationRequest(from,
                    getTenantMessage(tenant, 'enterAddressMessage', '📍 Please send your location or type your new delivery address'),
                    session.config);
            } else if (text.startsWith('address_')) {
                const addressId = parseInt(text.split('_')[1], 10);
                const selected = await CustomerAddress.findOne({ where: { id: addressId, customerPhone: from } });
                if (selected) {
                    let lat = selected.latitude;
                    let lng = selected.longitude;
                    if (lat == null || lng == null) {
                        const geo = await getCoordsFromAddress(selected.address, tenant.googleMapsApiKey);
                        if (geo) {
                            lat = geo.latitude;
                            lng = geo.longitude;
                            selected.latitude = lat;
                            selected.longitude = lng;
                            if (geo.formattedAddress && !selected.formattedAddress) {
                                selected.formattedAddress = geo.formattedAddress;
                            }
                            await selected.save().catch(e => console.error('Failed to update coordinates for saved address:', e.message));
                        }
                    }

                    if (!session.branchId && lat != null && lng != null) {
                        const nearest = await findNearestBranch(tenant.id, lat, lng);
                        if (nearest) {
                            session.branchId = nearest.id;
                            console.log(`[Geofencing] Resolved session.branchId to nearest branch #${nearest.id} (${nearest.name})`);
                        }
                    }

                    const availability = await checkDeliveryAvailability(session, lat, lng);
                    if (!availability.available) {
                        const limitKm = availability.deliveryRadius;
                        await sendTextMessage(from, `❌ Sorry, your saved address is outside our delivery radius of ${limitKm} km. Please select another address or add a new one.`, session.config);
                        await sendAddressSelectionOrRequest(from, session, tenant, {
                            addressIdPrefix: 'address_',
                            newAddressId: 'address_new',
                            nextState: 'CHECKOUT_ADDRESS'
                        });
                        return;
                    }

                    session.address = selected.address;
                    session.formattedAddress = selected.formattedAddress;
                    session.state = 'CHECKOUT_PAYMENT';
                    await sendButtonMessage(from,
                        getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?'),
                        buildPaymentButtons(tenant), session.config);
                } else {
                    await sendTextMessage(from, '❌ Invalid address selected. Please try again.', session.config);
                }
            } else {
                await handleAddressCollection(from, text, session, tenant);
            }
            return;
        }

        if (session.state === 'CATALOG_ORDER_ADDRESS_SELECT') {
            if (text === 'cataddress_new') {
                session.state = 'CATALOG_ORDER_ADDRESS';
                await sendLocationRequest(from,
                    getTenantMessage(tenant, 'catalogOrderReceived',
                        "✅ *Order Received!*\n\nPlease share your *Current Location* 📍 or type your *Delivery Address* below so we can process it immediately! 🛵"),
                    session.config);
            } else if (text.startsWith('cataddress_')) {
                const addressId = parseInt(text.split('_')[1], 10);
                const selected = await CustomerAddress.findOne({ where: { id: addressId, customerPhone: from } });
                if (selected) {
                    let lat = selected.latitude;
                    let lng = selected.longitude;
                    if (lat == null || lng == null) {
                        const geo = await getCoordsFromAddress(selected.address, tenant.googleMapsApiKey);
                        if (geo) {
                            lat = geo.latitude;
                            lng = geo.longitude;
                            selected.latitude = lat;
                            selected.longitude = lng;
                            if (geo.formattedAddress && !selected.formattedAddress) {
                                selected.formattedAddress = geo.formattedAddress;
                            }
                            await selected.save().catch(e => console.error('Failed to update coordinates for saved address:', e.message));
                        }
                    }

                    if (!session.branchId && lat != null && lng != null) {
                        const nearest = await findNearestBranch(tenant.id, lat, lng);
                        if (nearest) {
                            session.branchId = nearest.id;
                            console.log(`[Geofencing] Resolved session.branchId to nearest branch #${nearest.id} (${nearest.name})`);
                        }
                    }

                    const availability = await checkDeliveryAvailability(session, lat, lng);
                    if (!availability.available) {
                        const limitKm = availability.deliveryRadius;
                        await sendTextMessage(from, `❌ Sorry, your saved address is outside our delivery radius of ${limitKm} km. Please select another address or add a new one.`, session.config);
                        await sendAddressSelectionOrRequest(from, session, tenant, {
                            addressIdPrefix: 'cataddress_',
                            newAddressId: 'cataddress_new',
                            nextState: 'CATALOG_ORDER_ADDRESS'
                        });
                        return;
                    }

                    session.address = selected.address;
                    session.formattedAddress = selected.formattedAddress;
                    session.state = 'CHECKOUT_PAYMENT';
                    await sendButtonMessage(from,
                        getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?'),
                        buildPaymentButtons(tenant), session.config);
                } else {
                    await sendTextMessage(from, '❌ Invalid address selected. Please try again.', session.config);
                }
            } else {
                // Free-text address typed by the user
                await logCustomerActivity(from, tenant.id, session.branchId, 'ADDRESS_PROVIDED', { address: text });
                
                let lat = session.latitude;
                let lng = session.longitude;
                let formattedAddress = session.formattedAddress;

                if (lat == null || lng == null) {
                    const geo = await getCoordsFromAddress(text, tenant.googleMapsApiKey);
                    if (geo) {
                        lat = geo.latitude;
                        lng = geo.longitude;
                        formattedAddress = geo.formattedAddress;
                    }
                }

                if (!session.branchId && lat != null && lng != null) {
                    const nearest = await findNearestBranch(tenant.id, lat, lng);
                    if (nearest) {
                        session.branchId = nearest.id;
                        console.log(`[Geofencing] Resolved session.branchId to nearest branch #${nearest.id} (${nearest.name})`);
                    }
                }

                const availability = await checkDeliveryAvailability(session, lat, lng);
                if (!availability.available) {
                    const limitKm = availability.deliveryRadius;
                    await sendTextMessage(from, `❌ Sorry, we do not deliver to this location as it is outside our delivery radius of ${limitKm} km. Please select another address or add/send a different one.`, session.config);
                    return;
                }

                session.latitude = lat;
                session.longitude = lng;
                session.formattedAddress = formattedAddress;
                session.address = text;

                await saveCustomerAddress(from, text, formattedAddress, lat, lng);

                notificationService.sendToTenant(tenant.id, '📍 Address Received',
                    `Customer (+${from}) address: ${text}`, 'address_update',
                    { customerPhone: from, address: text, branchId: session.branchId }
                ).catch(err => console.error('[FCM error]', err.message));
                
                session.state = 'CHECKOUT_PAYMENT';
                await sendButtonMessage(from,
                    getTenantMessage(tenant, 'paymentMethodMessage', '💳 How would you like to pay?'),
                    buildPaymentButtons(tenant), session.config);
            }
            return;
        }

        if (session.state === 'CHECKOUT_ADDRESS') return await handleAddressCollection(from, text, session, tenant);
        if (session.state === 'CHECKOUT_PAYMENT') return await handlePaymentSelection(from, text, session, tenant);

        // ── Fallback ──────────────────────────────────────────────────
        await handleDefault(from, text, session, tenant);

    } catch (error) {
        console.error('[Webhook] Unhandled error:', error.response?.data || error.message, error.stack);
    }
};

// =========================
// Offer Calculation
// =========================
const calculateBestOffer = async (from, branchId, cartTotal, tenantId) => {
    try {
        if (!branchId && tenantId) {
            const firstBranch = await Branch.findOne({ where: { tenantId } });
            if (firstBranch) branchId = firstBranch.id;
        }

        const now = moment().tz('Asia/Kolkata').toDate();
        const startOfDay = moment().tz('Asia/Kolkata').startOf('day').toDate();

        const offers = await Offer.findAll({
            where: {
                branchId,
                isActive: true,
                minOrderValue: { [Op.lte]: cartTotal },
                // Using separate [Op.and] for startDate and endDate to avoid Sequelize key collision
                [Op.and]: [
                    {
                        [Op.or]: [
                            { startDate: null },
                            { startDate: { [Op.lte]: now } }
                        ]
                    },
                    {
                        [Op.or]: [
                            { endDate: null },
                            { endDate: { [Op.gte]: startOfDay } }
                        ]
                    }
                ]
            }
        });

        if (offers.length === 0) return null;

        const customerOrdersCount = await Order.count({
            where: { customerPhone: from, status: { [Op.ne]: 'cancelled' } }
        });

        // Batch the once_per_customer check to avoid N+1 per offer
        const onceCodes = offers
            .filter(o => o.usageType === 'once_per_customer')
            .map(o => o.code);

        const usedCodes = new Set(
            onceCodes.length > 0
                ? (await Order.findAll({
                    where: {
                        customerPhone: from,
                        appliedOfferCode: { [Op.in]: onceCodes },
                        status: { [Op.ne]: 'cancelled' }
                    },
                    attributes: ['appliedOfferCode']
                })).map(o => o.appliedOfferCode)
                : []
        );

        let bestOffer = null;
        let maxDiscountAmount = 0;

        for (const offer of offers) {
            if (offer.usageLimit !== null && offer.usageLimit <= 0) continue;
            if (offer.usageType === 'first_order_only' && customerOrdersCount > 0) continue;
            if (offer.usageType === 'once_per_customer' && usedCodes.has(offer.code)) continue;

            let discount = offer.discountType === 'flat'
                ? offer.discountValue
                : Math.min((cartTotal * offer.discountValue) / 100, offer.maxDiscount ?? Infinity);

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
// Abandoned Cart Monitor
// =========================
const checkAbandonedCarts = async () => {
    const now = Date.now();
    const THRESHOLD_MS = 60 * 60_000; // 1 hour

    for (const [phone, session] of Object.entries(sessions)) {
        const cart = carts[phone] || [];
        if (cart.length === 0 || !session.lastInteraction || session.abandonedNotified) continue;

        const idleTime = now - new Date(session.lastInteraction).getTime();
        if (idleTime < THRESHOLD_MS) continue;

        try {
            const tenant = await Tenant.findByPk(session.tenantId);
            if (!tenant) continue;

            console.log(`[AbandonedCart] Sending reminder to ${phone}`);
            const msg = getTenantMessage(tenant, 'abandonedCartMessage',
                '👋 Hey! You have items waiting in your cart. Ready to complete your order? 🛒');
            await sendTextMessage(phone, msg, session.config);
            session.abandonedNotified = true;
        } catch (e) {
            console.error(`[AbandonedCart] Failed for ${phone}:`, e.message);
        }
    }
};

setInterval(checkAbandonedCarts, 10 * 60_000); // every 10 minutes

module.exports = { verifyWebhook, receiveWebhook };