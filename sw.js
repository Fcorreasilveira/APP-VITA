// Service worker do VITA — controla cache e atualização de versão do app.
// Toda vez que você fizer o deploy de uma mudança relevante, troque o número
// abaixo (ex: 'vita-v2') para forçar os aparelhos a buscarem a versão nova.
const CACHE_NAME = 'vita-v5';

const APP_SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'app-cloud.js',
  'supabase-config.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const isAppCode = APP_SHELL.some((path) => req.url.endsWith(path)) || req.mode === 'navigate';

  if(isAppCode){
    // network-first: sempre tenta buscar a versão mais nova quando online
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // cache-first: fotos de exercício, fontes etc — não mudam com frequência
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
  }
});
