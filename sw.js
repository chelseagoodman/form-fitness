// FORM v3.8 test - migration away from offline app shell caching.
// Network-only service worker: do not cache private app pages or scripts.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('form-')).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
// No fetch interception: every navigation and asset request goes to the server.
