const admin = require('firebase-admin');
const path = require('path');
const { FcmToken, Notification } = require('../models');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '../config/firebase-service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

/**
 * Send push notification to all admins of a specific tenant
 */
async function sendToTenant(tenantId, title, body, type = 'general', extraData = {}) {
    try {
        // Save to notification history
        await Notification.create({
            title,
            body,
            type,
            tenantId,
            branchId: extraData.branchId || null,
            data: extraData
        });

        // Get all FCM tokens for this tenant
        const tokenRecords = await FcmToken.findAll({
            where: { tenantId }
        });

        if (tokenRecords.length === 0) return;
        const tokens = tokenRecords.map(t => t.token);

        const message = {
            notification: { title, body },
            data: {
                type,
                ...Object.fromEntries(Object.entries(extraData).map(([k, v]) => [k, String(v)]))
            }
        };

        // Firebase v12+ sendEachForMulticast has a 500-token limit per call
        const CHUNK_SIZE = 500;
        let successCount = 0;
        let totalSent = 0;
        const tokensToRemove = new Set();

        for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            const tokenChunk = tokens.slice(i, i + CHUNK_SIZE);
            const response = await admin.messaging().sendEachForMulticast({
                tokens: tokenChunk,
                ...message
            });

            successCount += response.successCount;
            totalSent += tokenChunk.length;

            // Identify invalid/stale tokens
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token'
                    ) {
                        tokensToRemove.add(tokenChunk[idx]);
                    }
                }
            });
        }

        // Clean up invalid tokens
        if (tokensToRemove.size > 0) {
            const invalidTokens = Array.from(tokensToRemove);
            await FcmToken.destroy({ where: { token: invalidTokens } });
            console.log(`[FCM] Cleaned up ${invalidTokens.length} stale/invalid tokens`);
        }

        console.log(`[FCM] Sent "${title}" to ${successCount}/${totalSent} devices for tenant ${tenantId}`);
    } catch (error) {
        console.error('[FCM] Error sending notification:', error.message);
    }
}

/**
 * Send push notification to all registered admins (for superadmin alerts)
 */
async function sendToAll(title, body, type = 'general', extraData = {}) {
    try {
        await Notification.create({ title, body, type, data: extraData });

        const tokenRecords = await FcmToken.findAll();
        if (tokenRecords.length === 0) return;

        const tokens = tokenRecords.map(t => t.token);

        await admin.messaging().sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: {
                type,
                ...Object.fromEntries(Object.entries(extraData).map(([k, v]) => [k, String(v)]))
            }
        });

        console.log(`[FCM] Broadcast "${title}" to ${tokens.length} devices`);
    } catch (error) {
        console.error('[FCM] Error broadcasting:', error.message);
    }
}

module.exports = { sendToTenant, sendToAll };
