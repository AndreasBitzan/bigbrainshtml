const SW_VERSION = 3;
const CACHE_NAME = `OFFLINE_VERSION_${SW_VERSION}`;

const assetsToCache = [
  "./manifest.json",
  "./script.js",
  "./index.html",
  "./images/brain.png",
  "./images/quote.png",
  "./styles.css",
  "./favicon.ico",
  "./logo192.png",
  "./logo512.png",
];

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] install event");
  //self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
      .then(() => console.log("assets cached"))
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

function update(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    }).catch(function(){console.log("Offline")});
  });
}

self.addEventListener("fetch", (event) => {
  console.log("[ServiceWorker] fetch event" + event.request.url);

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(
        `Hi ${client.id} you are loading the path ${event.request.url}`
      );
    });
  });

  if (event.request.method === "GET") {
    
    // Network first, then cache
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
      
    //Instantly update Citation Data in Cache
      event.waitUntil(update(event.request));
    
  }
});

self.addEventListener("message", function (event) {
  console.log("Message received",event.data); 
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      if(client.id !== event.source.id){
        console.log("Posting message to ",client.id)
        client.postMessage(event.data);
      }
    });
  });
});

self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Received.");
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const title = "Push Codelab";
  const options = {
    body: `${event.data.text()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification click Received.");
  event.notification.close();
});
