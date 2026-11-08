/* Optional offline reopening for the single-file MOHR app. */
const CACHE = 'mohr-single-html-v1';
const CACHE_PREFIXES = ['mohr-app-', 'mohr-page-', 'mohr-single-html-'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', 'index.html']))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== CACHE && CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const navigation = request.mode === 'navigate';
      try {
        // Read current HTML on each visit so direct edits appear after refreshing.
        const response = await fetch(request);
        if (navigation && response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('index.html', response.clone());
        }
        return response;
      } catch (error) {
        if (navigation) {
          const cache = await caches.open(CACHE);
          const shell = await cache.match('index.html');
          if (shell) return shell;
        }
        // Never substitute HTML for missing scripts or images.
        return Response.error();
      }
    })(),
  );
});
