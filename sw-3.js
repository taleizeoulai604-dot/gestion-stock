// Service Worker — Gestion de Stock
// Met en cache la coquille de l'application (HTML, polices, SDK Firebase)
// pour permettre de rouvrir l'app même sans connexion internet.
// Les données elles-mêmes restent gérées par le cache hors ligne de Firestore.

const CACHE_NAME = 'gestion-stock-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((res) => cache.put(url, res))
            .catch(() => { /* une ressource indisponible au moment de l'installation n'empêche pas le reste */ })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : essayer le réseau d'abord (pour avoir la dernière version),
// et si ça échoue (hors ligne), servir la version mise en cache.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
