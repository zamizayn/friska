/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBP94pNT2vKPuo6eeqfux_cDBF5jyJ20nc",
    authDomain: "wstore-7fc7c.firebaseapp.com",
    projectId: "wstore-7fc7c",
    storageBucket: "wstore-7fc7c.firebasestorage.app",
    messagingSenderId: "603302167646",
    appId: "1:603302167646:web:77f7e443bb3831cfc6a0cf"
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
