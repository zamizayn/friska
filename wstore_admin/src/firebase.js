import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyBP94pNT2vKPuo6eeqfux_cDBF5jyJ20nc",
    authDomain: "wstore-7fc7c.firebaseapp.com",
    projectId: "wstore-7fc7c",
    storageBucket: "wstore-7fc7c.firebasestorage.app",
    messagingSenderId: "603302167646",
    appId: "1:603302167646:web:77f7e443bb3831cfc6a0cf",
    measurementId: "G-9HWPKG5489"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = 'BP9khI5G_0PWV33BCnbd1RxosC9vM90_l1lVP2q2KOrMPbjrvAaHq8-G4VeWTwF1IYtEo8gOTnZ2_2P-9ipIfMc';

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
