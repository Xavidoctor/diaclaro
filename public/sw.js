// Service worker de DíaClaro: recibe los avisos aunque la app esté cerrada
// y, si no hay internet, enseña tus documentos importantes guardados en el
// móvil (public/sin-conexion.html). Solo guarda en caché esa pantalla:
// con conexión, la app funciona igual que siempre.

const CACHE = "diaclaro-sin-conexion-v1";
const SIN_CONEXION = "/sin-conexion.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SIN_CONEXION))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Borra cachés viejas de esta pantalla y empieza a funcionar ya.
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((c) => c.startsWith("diaclaro-") && c !== CACHE)
            .map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Solo cuando abres una pantalla (no imágenes ni datos) y falla la red.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(SIN_CONEXION).then(
        (guardada) =>
          guardada ||
          new Response("Sin conexión", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    ),
  );
});

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(datos.title || "DíaClaro", {
      body: datos.body || "",
      tag: datos.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: datos.url || "/" },
    }),
  );
});

// Al tocar el aviso, abre DíaClaro (o vuelve a la ventana que ya estaba abierta).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((ventanas) => {
        for (const v of ventanas) {
          if (new URL(v.url).origin === url.origin && "focus" in v) {
            v.navigate(url.href);
            return v.focus();
          }
        }
        return self.clients.openWindow(url.href);
      }),
  );
});
