/* Service Worker — macht die App offline lauffähig und installierbar.
 *
 * Gecacht wird nur die App selbst (HTML, CSS, JS, Schriften, Icons).
 * Spieldaten liegen in localStorage, Videos in IndexedDB — beides fasst
 * der Service Worker nicht an.
 *
 * WICHTIG: CACHE_VERSION bei jeder Änderung an den Dateien unten hochzählen,
 * sonst bekommen installierte Geräte die alte Fassung weiter ausgeliefert.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `hb-app-${CACHE_VERSION}`;

// Relative Pfade, damit es unter GitHub Pages im Unterordner genauso läuft wie lokal.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/fonts.css',
  './css/fonts/newsreader-latin.woff2',
  './css/fonts/newsreader-italic-latin.woff2',
  './js/vendor/chart.umd.min.js',
  './js/data.js',
  './js/court.js',
  './js/api.js',
  './js/csv.js',
  './js/video.js',
  './js/views.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll bricht komplett ab, wenn eine einzige Datei fehlt — deshalb
      // jede Datei einzeln, damit ein Tippfehler nicht die ganze Installation kippt.
      .then(cache => Promise.all(
        APP_SHELL.map(url => cache.add(url).catch(err => {
          console.warn('[sw] nicht gecacht:', url, err);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(namen => Promise.all(
        namen.filter(n => n.startsWith('hb-app-') && n !== CACHE_NAME)
             .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // z.B. OpenLigaDB — nie cachen

  // Navigationen: erst Netz (damit Updates ankommen), bei Ausfall die gecachte Seite.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const kopie = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', kopie));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Alles andere: erst Cache (schnell und offline), im Hintergrund nachladen.
  event.respondWith(
    caches.match(req).then(treffer => {
      const ausNetz = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const kopie = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, kopie));
        }
        return res;
      }).catch(() => treffer);
      return treffer || ausNetz;
    })
  );
});
