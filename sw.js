/* 纪念日 PWA Service Worker - 缓存静态资源，支持离线与安装 */
var CACHE_NAME = 'love-memorial-v3';
var urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/firebase-config.js',
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(urlsToCache.map(function (u) {
        return cache.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.url.indexOf(self.location.origin) !== 0) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request).then(function (res) {
        var clone = res.clone();
        if (res.status === 200 && (event.request.url.indexOf('firebase') === -1 && event.request.url.indexOf('gstatic') === -1))
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, clone); });
        return res;
      });
    })
  );
});
