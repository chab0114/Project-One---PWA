const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
    STATIC: `wheatflix-static-${CACHE_VERSION}`,
    DYNAMIC: `wheatflix-dynamic-${CACHE_VERSION}`,
    CART: `wheatflix-cart-${CACHE_VERSION}`,
    RENTED: `wheatflix-rented-${CACHE_VERSION}`
};

const ASSETS_TO_CACHE = [
    '/', 
    '/index.html',
    '/css/main.css',
    '/js/main.js',
    '/assets/images/placeholder.jpg',
    'https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@700&family=SF+Pro+Text:wght@400;500;600&family=DM+Sans:wght@400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/assets/videos/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(null, { status: 404 });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
