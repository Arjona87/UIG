/* Asistente UIG · Service worker: funciona sin conexión después de la primera visita.
   construir_base.py actualiza VERSION en cada reconstrucción para que los teléfonos descarguen la base nueva. */
const VERSION = '202611181731';
const CASCARA = 'uig-cascara-' + VERSION;
const DATOS = 'uig-datos-' + VERSION;
const ESENCIALES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'aviso-privacidad.html',
  'assets/fuentes.css', 'assets/logo-cges.png', 'assets/violeta.webp', 'assets/violeta-96.webp', 'assets/violeta-serena-96.webp',
  'assets/icono-192.png', 'assets/favicon.png',
  'data/docs.json', 'data/faq.json', 'data/riesgo.json', 'data/directorio.json', 'data/version.json', 'data/indice.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CASCARA).then(c => c.addAll(ESENCIALES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CASCARA && k !== DATOS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Precarga en segundo plano de los textos de nivel 1 y 2 (enviados por la página)
self.addEventListener('message', e => {
  if (e.data && e.data.tipo === 'precargar') {
    e.waitUntil(caches.open(DATOS).then(async c => {
      for (const u of e.data.urls) { if (!(await c.match(u))) { try { await c.add(u); } catch (err) {} } }
    }));
  }
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/data/docs/') || url.pathname.endsWith('indice-n3.json')) {
    // textos: primero caché; si no está, red y se guarda para usar sin conexión
    e.respondWith(caches.open(DATOS).then(async c => (await c.match(e.request)) ||
      fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  // datos esenciales: solo caché (se renuevan cuando cambia VERSION, al reconstruir la base)
  if (url.pathname.includes('/data/')) {
    e.respondWith(caches.open(CASCARA).then(async c => (await c.match(e.request, { ignoreSearch: true })) ||
      fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  // cáscara (html, css, js, imágenes): caché primero y actualización en segundo plano
  e.respondWith(caches.open(CASCARA).then(async c => {
    const enCache = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => enCache);
    return enCache || red;
  }));
});
