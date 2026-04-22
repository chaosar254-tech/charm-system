'use strict';

var CACHE_NAME = 'chaosar-models-v1';
var HERO_URL = 'https://models.chaosarmenu.com/chaosar-shop/bike.glb';
var MODEL_ORIGIN = 'https://models.chaosarmenu.com';

// İlk kurulumda hero modeli Cache API'ye al
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return fetch(new Request(HERO_URL, { mode: 'cors', credentials: 'omit' }))
        .then(function (response) {
          if (response.ok) return cache.put(HERO_URL, response);
        })
        .catch(function (err) {
          console.warn('[ChaosAR SW] Hero ön-cache başarısız:', err);
        });
    })
  );
  self.skipWaiting();
});

// Aktive olur olmaz mevcut sayfayı da kontrol al; eski cache'leri temizle
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Cache-first: R2'dan gelen tüm .glb / .usdz isteklerini yakala
self.addEventListener('fetch', function (event) {
  var url = event.request.url;
  var isModel = url.startsWith(MODEL_ORIGIN) &&
    (url.indexOf('.glb') !== -1 || url.indexOf('.usdz') !== -1);

  if (!isModel) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(url).then(function (cached) {
        if (cached) return cached;

        return fetch(event.request.clone()).then(function (response) {
          if (response.ok) cache.put(url, response.clone());
          return response;
        }).catch(function () {
          return new Response('Model geçici olarak kullanılamıyor.', { status: 503 });
        });
      });
    })
  );
});
