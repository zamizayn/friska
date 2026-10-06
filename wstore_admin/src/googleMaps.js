// Loads the Google Maps JS API once and calls back when it is ready (or has failed to load).
export const loadGoogleMapsScript = (apiKey, callback) => {
    if (!apiKey) {
        callback();
        return;
    }
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
        const interval = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(interval);
                callback();
            }
        }, 100);
        return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => callback();
    script.onerror = () => {
        console.error('Failed to load Google Maps script');
        callback();
    };
    document.head.appendChild(script);
};
