// Ma bibliothèque – service worker
// Les fichiers de l'appli sont toujours chargés depuis internet en priorité (= toujours la dernière version),
// et la copie en cache ne sert que hors ligne.
const APP = 'biblio-app';
const IMG = 'biblio-images';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== APP && k !== IMG) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers de l'appli : réseau d'abord, cache si hors ligne
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok) (await caches.open(APP)).put(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req)) || (req.mode === 'navigate' && await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Couvertures et polices : cache d'abord, pour les voir hors ligne
  if (req.destination === 'image' || req.destination === 'font' || url.host === 'fonts.googleapis.com') {
    e.respondWith((async () => {
      const cache = await caches.open(IMG);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      } catch (err) {
        return Response.error();
      }
    })());
  }
  // Recherches (Google Livres, Apple, Open Library) : jamais mises en cache
});
