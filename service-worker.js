// service-worker.js
// This will be placed in the public directory

const CACHE_NAME = 'prospecting-tool-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Skip non-GET requests and requests to API endpoints
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Update a service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// manifest.json
// {
//   "name": "Prospecting Tool",
//   "short_name": "ProspectPro",
//   "theme_color": "#2196f3",
//   "background_color": "#ffffff",
//   "display": "standalone",
//   "scope": "/",
//   "start_url": "/",
//   "icons": [
//     {
//       "src": "icons/icon-192x192.png",
//       "sizes": "192x192",
//       "type": "image/png",
//       "purpose": "any maskable"
//     },
//     {
//       "src": "icons/icon-512x512.png",
//       "sizes": "512x512",
//       "type": "image/png",
//       "purpose": "any maskable"
//     }
//   ]
// }

// Register service worker (to be included in your app.js)
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js')
//       .then(registration => {
//         console.log('ServiceWorker registration successful with scope: ', registration.scope);
//       })
//       .catch(err => {
//         console.log('ServiceWorker registration failed: ', err);
//       });
//   });
// }