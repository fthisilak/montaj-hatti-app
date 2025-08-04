const CACHE_NAME = 'montaj-hatti-v1.0.0';
const STATIC_CACHE_NAME = 'montaj-hatti-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'montaj-hatti-dynamic-v1.0.0';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch Events - Network First for Firebase, Cache First for others
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Firebase/Firestore requests - Network First strategy
  if (url.includes('firestore.googleapis.com') || 
      url.includes('firebase') || 
      url.includes('googleapis.com')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Static files - Cache First strategy
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                
                const cacheName = STATIC_FILES.includes(url) ? 
                  STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;
                
                caches.open(cacheName)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              
              return response;
            })
            .catch(() => {
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
        })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync triggered');
  
  if (event.tag === 'sync-downtimes') {
    event.waitUntil(syncOfflineData());
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Yeni bir bildirim',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Uygulamayı Aç',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Kapat',
        icon: '/icons/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Montaj Hattı Takip', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message Handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sync offline data function
async function syncOfflineData() {
  try {
    console.log('Service Worker: Syncing offline data...');
    // Future implementation for offline data sync
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

console.log('Service Worker: Loaded successfully');