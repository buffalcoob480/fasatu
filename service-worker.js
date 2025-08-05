
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('medapp').then(function(cache) {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './app.js',
        './medicamentos.json',
        './manifest.webmanifest',
        './icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
