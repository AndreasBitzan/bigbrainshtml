const SW_VERSION = 1;
const CACHE_NAME = `OFFLINE_VERSION_${SW_VERSION}`;

const assetsToCache = [
  './manifest.json',
  './script.js',
  './index.html',
  './images/brain.png',
  './images/quote.png',
  './styles.css',
  './favicon.ico',
  './logo192.png',
  './logo512.png',
];

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] install event");
  //self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
      .then(() => console.log('assets cached')),
  );
});

self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] activate event");
  //self.skipWaiting();

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            caches.delete(cacheName);
          } else {
            return null;
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  console.log("[ServiceWorker] fetch event" + event.request.url);

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(
        `Hi ${client.id} you are loading the path ${event.request.url}`
      );
    });
  });

  event.respondWith(
    (async () => {
      try {
        const networkRequest = await fetch(event.request);
        return networkRequest;
      } catch (error) {
        console.log(
          "[ServiceWorker] Fetch failed; returning offline page instead."
        );

          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if(cachedResponse) return cachedResponse;
          let fetchResponse = await fetch(event.request);
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
  
      };
    })()
  );
});

self.addEventListener("message", function (event) {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const title = 'Push Codelab';
  const options = {
    body: `${event.data.text()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick',
  function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
  }
);

