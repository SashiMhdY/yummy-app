// Service worker : l'app reste utilisable sans réseau (au magasin, par exemple).
// Stratégie « réseau d'abord » pour les fichiers de l'app : toujours la dernière version
// quand le réseau répond vite, sinon la copie en cache.
// Les appels à l'API GitHub ne passent pas par ce cache.

// À changer à chaque nouvelle version de l'app (même numéro que VERSION dans js/views/reglages.js) :
// le téléphone détecte alors la mise à jour et affiche « Nouvelle version disponible ».
const CACHE = 'yummy-app-1.4.0';
const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/github.js',
  './js/ui.js',
  './js/util.js',
  './js/md.js',
  './js/nutrition.js',
  './js/photos.js',
  './js/vendor/htm-preact.js',
  './js/views/semaine.js',
  './js/views/courses.js',
  './js/views/recettes.js',
  './js/views/edition.js',
  './js/views/reglages.js',
  './js/views/profils.js',
  './data/aliments.json',
  './fonts/sofia-sans-latin-400-normal.woff2',
  './fonts/sofia-sans-latin-600-normal.woff2',
  './fonts/sofia-sans-latin-700-normal.woff2',
  './fonts/sofia-sans-extra-condensed-latin-700-normal.woff2',
  './fonts/sofia-sans-extra-condensed-latin-800-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : ignore le cache du navigateur pour partir des fichiers tout juste publiés
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache: 'no-cache' : redemande toujours au serveur si le fichier a changé (GitHub Pages laisse sinon 10 min de cache)
      const reseau = fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((r) => {
          if (r.ok) cache.put(e.request, r.clone());
          return r;
        })
        .catch(() => null);
      const delai = new Promise((res) => setTimeout(() => res(null), 3500));
      const r = await Promise.race([reseau, delai]);
      if (r) return r;
      const c = await cache.match(e.request, { ignoreSearch: true });
      return c || (await reseau) || new Response('Hors ligne', { status: 503 });
    })(),
  );
});
