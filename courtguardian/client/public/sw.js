// CourtGuardian Service Worker
const CACHE_NAME = 'courtguardian-v1';
const API_CACHE_NAME = 'courtguardian-api-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/icon-logo.svg',
  '/single-line-logo.svg'
];

// API routes to cache for offline access
const API_ROUTES = [
  '/api/courts',
  '/api/user/saved-courts'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // If network fails and no cache, return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Handle API requests with cache-first strategy for saved courts
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For saved courts, try cache first, then network
    if (url.pathname.includes('/saved-courts')) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Serve cached version immediately
        fetchAndUpdateCache(request);
        return cachedResponse;
      }
    }

    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline - this data is not available without internet connection',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background fetch and cache update
async function fetchAndUpdateCache(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('[SW] Background fetch failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New courts available near you!',
    icon: '/icon-logo.svg',
    badge: '/favicon.ico',
    tag: 'courtguardian-notification',
    requireInteraction: false,
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'CourtGuardian', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  // Open the app or focus existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-courts') {
    event.waitUntil(syncCourts());
  }
});

// Sync courts data when back online
async function syncCourts() {
  try {
    // Refresh saved courts cache
    const cache = await caches.open(API_CACHE_NAME);
    const savedCourtsRequest = new Request('/api/user/saved-courts');
    
    const response = await fetch(savedCourtsRequest);
    if (response.status === 200) {
      cache.put(savedCourtsRequest, response.clone());
      console.log('[SW] Courts data synced');
    }
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}