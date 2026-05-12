const { GoogleGenAI } = require('@google/genai');
const { Category, Product } = require('../models');

const initializeAI = (apiKey) => {
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

const getStoreContext = async (branchId) => {
    let contextStr = "Here is the menu and product catalog available at the store:\n\n";

    try {
        const categories = await Category.findAll({
            where: { branchId },
            order: [['name', 'ASC']]
        });

        for (const cat of categories) {
            contextStr += `### Category: ${cat.name}\n`;

            const products = await Product.findAll({
                where: { categoryId: cat.id }
            });

            if (products.length === 0) {
                contextStr += "- No active products in this category.\n";
            } else {
                for (const prod of products) {
                    contextStr += `- ${prod.name} (₹${prod.price}): ${prod.description || 'No description'}\n`;
                }
            }
            contextStr += "\n";
        }
    } catch (e) {
        console.error("Failed to fetch store context for AI:", e);
        contextStr += "(Error loading full menu, assist with general questions.)\n";
    }

    return contextStr;
};

const generateSupportResponse = async (tenant, session, customerMessage) => {
    const aiInstance = initializeAI(tenant.geminiApiKey);
    if (!aiInstance) {
        console.log(`AI not configured for tenant: ${tenant.name}`);
        return null;
    }

    const storeContext = await getStoreContext(session.branchId);

    const systemInstruction = `You are a friendly, helpful customer support assistant for a store named "${tenant.name}". 
Your goal is to answer customer questions based on the provided menu context. 
Be polite, concise, and use emojis.
If a customer asks to "order", "buy", or "checkout", politely instruct them to type "shop" or "menu" to view the interactive catalog.
If a customer asks a question completely unrelated to the store, food, delivery, or business hours, politely decline to answer and say you can only help with store-related queries.

${storeContext}`;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: customerMessage,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3,
            }
        });

        return response.text;
    } catch (error) {
        console.error('Gemini AI Error:', error.message);
        // If Google AI is overloaded (503), let the user know politely.
        if (error.status === 503 || error.message.includes('503')) {
            return "I'm sorry, but my AI system is currently experiencing high demand. Please try again in a few moments! 🙏";
        }
        return null; // Fallback to standard flow if AI fails
    }
};

module.exports = {
    generateSupportResponse
};
