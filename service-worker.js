/* =====================================================================
   MU MISTRY – service-worker.js
   • Caches the app shell so the app opens instantly and works offline
     (showing saved screens; live data needs internet).
   • NEVER caches API calls to Google Apps Script (always live data).
   • Updates: bump VERSION when you change any file. The app then shows
     "A new version is available → Update".
   Developed by Debasis Rout
   ===================================================================== */
const VERSION = 'mm-v1.0.0';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/app.css',
  './js/config.js',
  './js/api.js',
  './js/ui.js',
  './js/home.js',
  './js/customer.js',
  './js/professional.js',
  './js/admin.js',
  './js/app.js',
  './js/offline.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)));
  // No skipWaiting here: the page asks the user before switching to the new version.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.indexOf(VERSION) !== 0).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. Live API – never cache.
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // 2. Page navigations – network first, then cached app, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // 3. Google Fonts – cache first (they rarely change).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // 4. Our own files – serve from cache, refresh in the background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
        const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || network;
      }))
    );
  }
});
