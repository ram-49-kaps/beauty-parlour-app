const CACHE_NAME = 'flawless-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/offline.html'
];

// Install SW
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate SW
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Strategy: Network First (Critical for Data Consistency in Booking App)
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // For API requests, always go network only (never cache appointments offline)
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Handle Navigation Requests (HTML Pages)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If network fails (offline), show custom offline page
                    return caches.match('/offline.html');
                })
        );
        return;
    }

    // For other requests (JS, CSS, Images, Fonts)
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
