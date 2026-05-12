const axios = require('axios');

const getUrl = (config) => {
    const version = config.version || process.env.GRAPH_API_VERSION || 'v21.0';
    const phoneId = config.phoneNumberId || process.env.PHONE_NUMBER_ID;
    return `https://graph.facebook.com/${version}/${phoneId}/messages`;
};

const getHeaders = (config) => {
    const token = config.whatsappToken || process.env.WHATSAPP_TOKEN;
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const sendTextMessage = async (to, message, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Text Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendButtonMessage = async (to, bodyText, buttons, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.map(button => ({
                        type: 'reply',
                        reply: { id: button.id, title: button.title }
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Button Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendListMessage = async (to, bodyText, buttonText, sections, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: bodyText },
                action: {
                    button: (buttonText || 'Select').slice(0, 20),
                    sections: sections.map(s => ({
                        ...s,
                        title: (s.title || '').slice(0, 24)
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp List Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendImageMessage = async (to, imageUrl, caption = '', config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'image',
            image: { link: imageUrl, caption }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Image Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendVideoMessage = async (to, videoUrl, caption = '', config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'video',
            video: { link: videoUrl, caption }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Video Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendLocationRequest = async (to, bodyText, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'location_request_message',
                body: { text: bodyText },
                action: { name: 'send_location' }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Location Request Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendProductCardMessage = async (to, product, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                header: { type: 'image', image: { link: product.image } },
                body: {
                    text: `🔥 ${product.name}\n\n💰 ₹${product.price}\n\n📝 ${product.description}`
                },
                footer: { text: 'Friska 🛍️' },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: `add_${product.id}`, title: 'Add To Cart' } },
                        { type: 'reply', reply: { id: `buy_${product.id}`, title: 'Buy Now' } }
                    ]
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Product Card Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendSingleProductMessage = async (to, catalogId, productRetailerId, bodyText = 'Here is the product you requested', footerText = 'Friska 🛍️', config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'product',
                body: { text: bodyText },
                footer: { text: footerText },
                action: {
                    catalog_id: catalogId,
                    product_retailer_id: productRetailerId
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Single Product Error:', error.response?.data || error.message);
        throw error;
    }
};

const sendMultiProductMessage = async (to, catalogId, headerText = 'Our Products', bodyText = 'Check out our latest collection', sections, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'product_list',
                header: { type: 'text', text: headerText.slice(0, 60) },
                body: { text: bodyText },
                footer: { text: 'Friska 🛍️' },
                action: {
                    catalog_id: catalogId,
                    sections: sections.map(s => ({
                        title: (s.title || '').slice(0, 24),
                        product_items: s.product_items
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Multi Product Error:', JSON.stringify(error.response?.data || error.message, null, 2));
        console.error('Payload:', JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'product_list',
                header: { type: 'text', text: headerText.slice(0, 60) },
                body: { text: bodyText },
                footer: { text: 'Friska 🛍️' },
                action: {
                    catalog_id: catalogId,
                    sections: sections.map(s => ({
                        title: (s.title || '').slice(0, 24),
                        product_items: s.product_items
                    }))
                }
            }
        }, null, 2));
        throw error;
    }
};

const sendCarouselMessage = async (to, bodyText, cards, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'carousel',
                body: { text: bodyText },
                action: {
                    cards: cards.map((card, index) => ({
                        card_index: index,
                        type: 'button',
                        header: {
                            type: 'image',
                            image: { link: card.image }
                        },
                        body: {
                            text: (card.title || '').slice(0, 32)
                        },
                        action: {
                            buttons: card.buttons.map(btn => ({
                                type: 'quick_reply',
                                quick_reply: { id: btn.id, title: btn.title.slice(0, 20) }
                            }))
                        }
                    }))
                }
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Carousel Error Payload:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

const sendDocumentMessage = async (to, mediaId, filename, config = {}) => {
    try {
        await axios.post(getUrl(config), {
            messaging_product: 'whatsapp',
            to,
            type: 'document',
            document: {
                id: mediaId,
                filename
            }
        }, { headers: getHeaders(config) });
    } catch (error) {
        console.error('WhatsApp Document Error:', error.response?.data || error.message);
        throw error;
    }
};

const uploadMedia = async (filePath, type, config = {}) => {
    try {
        const phoneId = config.phoneNumberId || process.env.PHONE_NUMBER_ID;
        const token = config.whatsappToken || process.env.WHATSAPP_TOKEN;
        const version = config.version || process.env.GRAPH_API_VERSION || 'v17.0';

        const FormData = require('form-data');
        const fs = require('fs');
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('type', type);
        form.append('messaging_product', 'whatsapp');

        const res = await axios.post(`https://graph.facebook.com/${version}/${phoneId}/media`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        return res.data.id;
    } catch (error) {
        console.error('WhatsApp Media Upload Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Syncs a product to the Meta Catalog via the Batch API
 */
const syncProductToMeta = async (product, config) => {
    const { catalogId, whatsappToken } = config;
    if (!catalogId || !whatsappToken) {
        console.log('[Meta Sync] Skipped: catalogId or whatsappToken missing');
        return;
    }

    try {
        console.log(`[Meta Sync] 🚀 Starting upload for: ${product.name}`);
        const axios = require('axios');
        const version = config.version || process.env.GRAPH_API_VERSION || 'v17.0';
        const url = `https://graph.facebook.com/${version}/${catalogId}/batch`;

        const payload = {
            allow_upsert: true,
            item_type: 'ITEM', // ✅ required here
            requests: [{
                method: 'CREATE',
                retailer_id: String(product.retailerId),
                data: {
                    name: product.name,
                    description: (product.description || product.name).slice(0, 9000),
                    image_url: product.image,
                    price: Math.round(product.price * 100),
                    currency: 'INR',
                    availability: (product.stock && product.stock > 0) ? 'in stock' : 'out of stock',
                    condition: 'new',
                    url: `https://wstore.app/p/${product.id}`
                }
            }]
        };

        const res = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[Meta Sync] Result for ${product.name}:`, JSON.stringify(res.data, null, 2));
        return res.data;
    } catch (e) {
        console.error(`[Meta Sync] Failed for ${product.name}:`, e.response?.data || e.message);
        throw e;
    }
};

module.exports = {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendImageMessage,
    sendVideoMessage,
    sendLocationRequest,
    sendProductCardMessage,
    sendSingleProductMessage,
    sendMultiProductMessage,
    sendCarouselMessage,
    sendDocumentMessage,
    uploadMedia,
    syncProductToMeta
};