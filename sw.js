const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
    APP: 'appFiles_5',
    CART: 'cart-items-v1', 
    RENTED: 'rented-items-v1',
    SEARCH: 'search-results-v1',
    IMAGES: 'movie-images-v1',
    DYNAMIC: 'dynamic-content-v1' 
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
    console.log('[SW] Installing...', new Date().toLocaleTimeString());
    event.waitUntil(
        caches.open(CACHE_NAMES.APP)
            .then(cache => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('[SW] Cache error:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...', new Date().toLocaleTimeString());
    event.waitUntil(
        caches.keys().then(keys => {
            console.log('[SW] Found caches:', keys);
            return Promise.all(
                keys.map(key => {
                    if (!Object.values(CACHE_NAMES).includes(key)) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

function isImageRequest(request) {
    return request.destination === 'image' || 
           request.url.includes('/w500/') || 
           request.url.endsWith('.jpg') || 
           request.url.endsWith('.png');
}

function isApiRequest(request) {
    const isApi = request.url.includes('api.themoviedb.org');
    console.log('[SW] Checking if API request:', request.url, isApi);
    return isApi;
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    console.log('[SW] Fetch request for:', url.pathname, 'Method:', event.request.method);

    if (event.request.url.includes('/assets/videos/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                console.log('[SW] Video fetch failed, returning 404');
                return new Response(null, { status: 404 });
            })
        );
        return;
    }

    if (isImageRequest(event.request)) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log('[SW] Found image in cache:', event.request.url);
                        return response;
                    }

                    console.log('[SW] Fetching image:', event.request.url);
                    return fetch(event.request)
                        .then(networkResponse => {
                            const clonedResponse = networkResponse.clone();
                            caches.open(CACHE_NAMES.IMAGES)
                                .then(cache => {
                                    console.log('[SW] Caching new image:', event.request.url);
                                    cache.put(event.request, clonedResponse);
                                });
                            return networkResponse;
                        })
                        .catch(() => {
                            console.log('[SW] Image fetch failed, using placeholder');
                            return caches.match('/assets/images/placeholder.jpg');
                        });
                })
        );
        return;
    }

    if (isApiRequest(event.request)) {
        console.log('[SW] API request:', event.request.url);
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    console.log('[SW] API response received');
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAMES.SEARCH)
                        .then(cache => {
                            console.log('[SW] Caching API response');
                            cache.put(event.request, clonedResponse);
                        });
                    return response;
                })
                .catch(() => {
                    console.log('[SW] API fetch failed, checking cache');
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                console.log('[SW] Found API response in cache');
                                return cachedResponse;
                            }
                            console.log('[SW] No cached API response, returning empty results');
                            return new Response(JSON.stringify({ results: [] }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                })
        );
        return;
    }

    if (isApiRequest(event.request)) {
        console.log('[SW] API request:', event.request.url);
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    console.log('[SW] API response received');
                    return response;
                })
                .catch(() => {
                    console.log('[SW] API fetch failed, checking cache');
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                console.log('[SW] Found API response in cache');
                                return cachedResponse;
                            }
                            console.log('[SW] No cached API response, returning empty results');
                            return new Response(JSON.stringify({ results: [] }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[SW] Found in cache:', event.request.url);
                    return response;
                }
                console.log('[SW] Fetching:', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse.ok) {
                            const clonedResponse = networkResponse.clone();
                            caches.open(CACHE_NAMES.DYNAMIC)
                                .then(cache => {
                                    console.log('[SW] Caching new resource:', event.request.url);
                                    cache.put(event.request, clonedResponse);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[SW] Fetch failed:', error);
                        return new Response('Network error', { status: 404 });
                    });
            })
    );
});