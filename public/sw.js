const CACHE_NAME = 'forkflow-pos-v1.0.0';
const RUNTIME_CACHE = 'forkflow-pos-runtime-v1.0.0';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName =>
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName.startsWith('forkflow-pos-')
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests to avoid cache errors
  if (request.method !== 'GET' || url.pathname.includes('/node_modules/')) {
    return; // Let browser handle these normally
  }

  // Define allowed external origins for caching
  const allowedOrigins = [
    self.location.origin,
    'https://firebasestorage.googleapis.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];

  // Only handle navigation requests and static assets from allowed domains
  if (allowedOrigins.some(origin => url.origin.startsWith(origin))) {
    if (isStaticAsset(request)) {
      event.respondWith(handleStaticAsset(request));
    } else if (request.mode === 'navigate') {
      event.respondWith(handleNavigationRequest(request));
    }
  }
});

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Don't wait for cache.put to complete to avoid blocking
      cache.put(request, networkResponse.clone()).catch(err =>
        console.log('[SW] Cache put failed:', err)
      );
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);

    // Try to return cached version even if network failed
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');

    // Fallback to cached index.html for SPA routing
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }

    // Final fallback - simple offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ForkFlow POS - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .offline-message { color: #666; margin-bottom: 2rem; }
            .retry-button { 
              background: #15803d; 
              color: white; 
              border: none; 
              padding: 1rem 2rem; 
              border-radius: 0.5rem; 
              cursor: pointer;
              font-size: 1rem;
            }
            .retry-button:hover { background: #166534; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>You're offline</h1>
          <p class="offline-message">
            ForkFlow POS is not available offline. Please check your internet connection.
          </p>
          <button class="retry-button" onclick="window.location.reload()">
            Try Again
          </button>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Helper function to identify static assets
function isStaticAsset(request) {
  const url = new URL(request.url);

  // Cache image assets from Firebase Storage
  if (url.hostname === 'firebasestorage.googleapis.com') {
    return true;
  }

  // Cache Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return true;
  }

  // Only cache specific static assets
  return request.url.includes('/icons/') ||
    request.url.includes('/images/') ||
    request.url.endsWith('.png') ||
    request.url.endsWith('.jpg') ||
    request.url.endsWith('.jpeg') ||
    request.url.endsWith('.svg') ||
    request.url.endsWith('.woff2') ||
    request.url.endsWith('.css') ||
    (request.url.endsWith('.js') && !request.url.includes('/node_modules/'));
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Sync offline orders when back online
async function syncOfflineOrders() {
  try {
    console.log('[SW] Syncing offline orders...');
    // This would sync any offline orders
    // Implementation depends on your offline storage strategy
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New notification from ForkFlow POS',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ForkFlow POS', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker loaded successfully');