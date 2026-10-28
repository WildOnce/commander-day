// Network-first service worker: always fresh when online, works offline from cache.
const CACHE = 'cz-v24';
const SHELL = ['./', './index.html', './host.html', './tv.html', './css/style.css?v=24', './js/app.js?v=24', './js/ctx.js', './js/sync.js', './js/util.js',
  './js/logic.js', './js/lc.js', './js/wrapped.js', './js/sprites.js', './js/art.js', './js/demo.js', './js/demo-store.js', './vendor/mqtt.min.js', './vendor/qrcode.js',
  './manifest.webmanifest', './manifest-host.webmanifest', './icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.includes('scryfall')) return;
  const same = u.origin === location.origin;
  e.respondWith(fetch(e.request, same ? { cache: 'no-cache' } : undefined).then((r) => {
    if (r.ok && (u.origin === location.origin || u.hostname.includes('fonts.g'))) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: u.origin === location.origin }).then((r) => r || caches.match('./index.html'))));
});
