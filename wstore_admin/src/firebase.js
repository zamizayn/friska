import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyC2OnpWf_xS742P-gPllcsFnIQxUsM9se0",
    authDomain: "friska-206d4.firebaseapp.com",
    projectId: "friska-206d4",
    storageBucket: "friska-206d4.firebasestorage.app",
    messagingSenderId: "356893104172",
    appId: "1:356893104172:web:f6acf50f5f7761dddc1989",
    measurementId: "G-QZKQJFLCV1"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = 'BK9ireKy-MBIM_0s3hug5Kfz1MHZMBRVXp7kt0LUe5NgoeAotVAv0S5gOJ68OPynSsNMVf0C3hSXDf3-HgFQ0LE';

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[FCM] Notification permission denied');
            return null;
        }

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        console.log('[FCM] Token obtained:', token?.substring(0, 20) + '...');
        return token;
    } catch (error) {
        console.error('[FCM] Error getting token:', error);
        return null;
    }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback) {
    return onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        callback(payload);
    });
}

export { messaging };
