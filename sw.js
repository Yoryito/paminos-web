/* ==================== Service Worker ====================
   Hace que la app se pueda «instalar» en el móvil y se abra aunque haya mala
   cobertura. NO guarda nada de la nube: solo cachea la propia app (su HTML,
   CSS, JS e iconos) para que arranque sin conexión. Los datos siguen yendo por
   Supabase/localStorage como siempre.

   Estrategia pensada para que las actualizaciones lleguen igualmente:
   - Al navegar (abrir la app): se intenta la RED, pero con un LÍMITE DE ESPERA
     de unos segundos. Si la red contesta, siempre ves la última versión; si
     tarda de más o falla, se sirve la copia cacheada al instante y la descarga
     sigue por detrás para dejar la copia fresca de cara a la próxima vez.
     El límite existe por una razón real: en noviembre de 2026 la línea de casa
     no alcanzaba las direcciones de Cloudflare donde vivía la web, y sin límite
     el navegador se quedaba ~40 segundos en blanco antes de rendirse.
   - Los assets con nombre versionado (/assets/xxxx.js): de la caché primero
     (son inmutables, no cambian sin cambiar de nombre) — carga instantánea.
   - Cualquier petición a otro dominio (p. ej. Supabase) NO se toca.

   Todas las rutas son RELATIVAS (resuelven contra la carpeta de este archivo),
   para que la app funcione igual publicada en la raíz de un dominio o dentro de
   una subcarpeta, como en el espejo de GitHub Pages. */

const CACHE = "paminos-v2";
const INDEX = new URL("./index.html", self.location).href;
const RAIZ = new URL("./", self.location).href;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const ESPERA_RED = 3500;   // ms que se le conceden a la red antes de tirar de copia

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys().then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Devuelve lo que dé la promesa, o null si tarda más de `ms` (o falla). */
function conLimite(promesa, ms) {
  return new Promise(resolve => {
    let hecho = false;
    const fin = v => { if (!hecho) { hecho = true; resolve(v); } };
    const t = setTimeout(() => fin(null), ms);
    promesa.then(v => { clearTimeout(t); fin(v); }, () => { clearTimeout(t); fin(null); });
  });
}

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase y demás: sin tocar

  // Navegación (abrir la app): red con límite de espera, copia de respaldo.
  if (req.mode === "navigate") {
    const red = fetch(req).then(res => {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(INDEX, copia));
      }
      return res;
    });
    ev.waitUntil(red.catch(() => {}));   // que termine de refrescar la copia aunque ya hayamos contestado
    ev.respondWith((async () => {
      const res = await conLimite(red, ESPERA_RED);
      if (res) return res;
      const guardada = (await caches.match(INDEX)) || (await caches.match(RAIZ));
      return guardada || red;            // sin copia no hay más remedio que esperar a la red
    })());
    return;
  }

  // Assets versionados: caché primero, y si no está, red (y se guarda).
  ev.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.pathname.includes("/assets/") || url.pathname.includes("/icons/"))) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return res;
    }).catch(() => hit))
  );
});
