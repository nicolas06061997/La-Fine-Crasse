// MYTHORIA a déménagé : ce service worker se supprime tout seul et envoie vers la nouvelle adresse.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('mythoria-')) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll()) c.navigate('https://nicolas06061997.github.io/mythoria-game/');
})()));
