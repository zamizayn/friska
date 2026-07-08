/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC2OnpWf_xS742P-gPllcsFnIQxUsM9se0",
    authDomain: "friska-206d4.firebaseapp.com",
    projectId: "friska-206d4",
    storageBucket: "friska-206d4.firebasestorage.app",
    messagingSenderId: "356893104172",
    appId: "1:356893104172:web:f6acf50f5f7761dddc1989"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const { title, body } = payload.notification || {};
    const notificationOptions = {
        body: body || 'New notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.type || 'default',
        data: payload.data
    };

    self.registration.showNotification(title || 'Friska', notificationOptions);
});

// Handle notification click — navigate to admin dashboard
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const type = event.notification.data?.type;
    let url = '/admin';

    if (type === 'new_order') url = '/admin/orders';
    else if (type === 'support_request') url = '/admin/support';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
