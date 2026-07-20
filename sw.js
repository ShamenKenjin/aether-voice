// Aether — sw.js
// Service Worker for offline caching + PWA installability
var CACHE_NAME = 'aether-v2';

var ASSETS = [
  '/aether-voice/',
  '/aether-voice/index.html',
  '/aether-voice/manifest.json',
  '/aether-voice/css/style.css',
  '/aether-voice/js/config.js',
  '/aether-voice/js/sfx.js',
  '/aether-voice/js/wakeword.js',
  '/aether-voice/js/vision.js',
  '/aether-voice/js/speech.js',
  '/aether-voice/js/llm.js',
  '/aether-voice/js/conversation.js',
  '/aether-voice/js/orb.js',
  '/aether-voice/js/ui.js',
  '/aether-voice/js/app.js'
];

// Install: cache all static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-only for API
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip API calls (let them go to network)
  if (url.pathname.indexOf('/api/') >= 0 ||
      url.hostname.indexOf('api.') === 0 ||
      url.hostname === 'generativelanguage.googleapis.com' ||
      url.hostname === 'api.deepseek.com' ||
      url.hostname === 'cdnjs.cloudflare.com') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
