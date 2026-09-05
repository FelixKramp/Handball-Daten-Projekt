/* Service Worker — macht die App offline lauffähig und installierbar.
 *
 * Gecacht wird nur die App selbst (HTML, CSS, JS, Schriften, Icons).
 * Spieldaten liegen in localStorage, Videos in IndexedDB — beides fasst
 * der Service Worker nicht an.
 *
 * WICHTIG: CACHE_VERSION bei jeder Änderung an den Dateien unten hochzählen,
 * sonst bekommen installierte Geräte die alte Fassung weiter ausgeliefert.
 */

const CACHE_VERSION = 'v4';
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

/* Wie lange auf das Netz gewartet wird, bevor der Cache einspringt.
   In einer Halle mit schwachem WLAN darf der Start nicht daran haengen. */
const NETZ_FRIST_MS = 3000;

function ausNetzMitFrist(req) {
  return new Promise((resolve, reject) => {
    const uhr = setTimeout(() => reject(new Error('Zeitueberschreitung')), NETZ_FRIST_MS);
    fetch(req).then(
      res => { clearTimeout(uhr); resolve(res); },
      err => { clearTimeout(uhr); reject(err); }
    );
  });
}

/* ERST NETZ, dann Cache — fuer ALLES, nicht nur fuer Navigationen.
 *
 * Vorher war es umgekehrt: die Seite kam frisch, JS und CSS aber aus dem
 * Cache. Auf dem Homescreen-Symbol lief dadurch dauerhaft eine veraltete
 * Fassung, im besten Fall immer genau einen Start hinterher — im
 * schlechtesten beliebig lange, wenn das Nachladen im Hintergrund nie
 * durchkam. Fuer eine App, mit der ein laufendes Spiel erfasst wird, ist
 * das die gefaehrlichere Seite des Kompromisses: lieber drei Sekunden auf
 * das Netz warten als mit altem Stand ins Spiel gehen.
 *
 * Offline bleibt es voll benutzbar — dann greift der Cache sofort. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // z.B. OpenLigaDB — nie cachen

  const istNavigation = req.mode === 'navigate';
  const cacheSchluessel = istNavigation ? './index.html' : req;

  event.respondWith(
    ausNetzMitFrist(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const kopie = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(cacheSchluessel, kopie));
        }
        return res;
      })
      .catch(() => caches.match(cacheSchluessel).then(treffer =>
        treffer || new Response('Offline und nicht im Zwischenspeicher', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      ))
  );
});
