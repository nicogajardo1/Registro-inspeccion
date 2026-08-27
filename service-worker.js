/**
 * Service Worker — Registro de Inspección QA/QC
 *
 * Qué hace: guarda una copia local (caché) de la app la primera vez que se
 * abre con internet. Desde ese momento, el navegador puede volver a abrir
 * la app SIN conexión (modo avión, sin señal, etc.) porque la sirve desde
 * esta copia guardada en el celular/PC, en vez de tener que descargarla
 * de internet cada vez.
 *
 * Esto es solo para que la PÁGINA cargue offline. El guardado de las
 * revisiones y su sincronización con Google Sheets ya lo maneja la propia
 * app con IndexedDB — este archivo no toca esa parte.
 *
 * IMPORTANTE: cada vez que subas una versión nueva de index.html a GitHub,
 * sube el número de CACHE_VERSION de abajo (ej: "v2", "v3"...) para que
 * los celulares descarguen la versión nueva en vez de seguir usando la
 * copia vieja guardada. Si no lo subes, igual se actualiza sola en algún
 * momento, pero puede tardar más.
 */

const CACHE_VERSION = "v7";
const CACHE_NAME = "qaqc-inspeccion-" + CACHE_VERSION;

const ARCHIVOS_A_GUARDAR = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

// Al instalarse, descarga y guarda una copia de todos los archivos de la app.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_A_GUARDAR))
  );
  self.skipWaiting();
});

// Al activarse, borra copias de versiones anteriores para no acumular espacio.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// Al pedir cualquier archivo de la app: si hay internet, trae la versión más
// nueva y actualiza la copia guardada. Si NO hay internet, usa la copia
// guardada. Así siempre se ve la versión más actual posible, pero nunca se
// rompe por falta de señal.
self.addEventListener("fetch", (event) => {
  // Las llamadas al Apps Script (guardar/leer datos) NUNCA pasan por el
  // caché: esas sí necesitan internet real, tal como corresponde.
  if (event.request.url.includes("script.google.com")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html")))
  );
});
