// =============================================================================
// VERO — SERVICE WORKER
// Estratégia: cache-first para o app shell (HTML/manifest/ícone), com
// atualização em segundo plano (stale-while-revalidate) e fallback de rede.
// Não faz cache de chamadas ao Supabase (API/auth) — essas sempre vão à rede.
// =============================================================================

const CACHE_VERSION = 'vero-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Nunca cachear chamadas a APIs externas (Supabase, fontes, etc.) — só o app shell local.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached); // offline: usa o que já está em cache

      return cached || network;
    })
  );
});
