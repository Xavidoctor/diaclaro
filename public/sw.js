// Service worker de DíaClaro: recibe los avisos aunque la app esté cerrada
// y te deja usar la app sin internet:
// - Guarda una copia de cada pantalla que abres (Hoy, Agenda, Tareas...).
//   Sin conexión te enseña la última copia; con conexión, siempre la nueva.
// - Guarda los archivos de la app (estilos, letra, código) para que esas
//   copias se vean bien.
// - Si no hay copia de una pantalla, enseña tus documentos importantes
//   guardados en el móvil (public/sin-conexion.html).

const CACHE = "diaclaro-sin-conexion-v1";
const PAGINAS = "diaclaro-paginas";
const ARCHIVOS = "diaclaro-archivos";
const SIN_CONEXION = "/sin-conexion.html";
const MAX_PAGINAS = 40;
const MAX_ARCHIVOS = 200;

// Pantallas que nunca se guardan: entrar, enlaces del email, datos, compartir.
const NO_GUARDAR = ["/login", "/auth", "/api", "/compartir", "/exportar"];

function sePuedeGuardar(url) {
  return (
    url.origin === self.location.origin &&
    !NO_GUARDAR.some((r) => url.pathname.startsWith(r))
  );
}

// Borra lo más antiguo si una caché tiene demasiadas cosas.
async function recortar(nombre, maximo) {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  await Promise.all(
    claves.slice(0, Math.max(0, claves.length - maximo)).map((c) => cache.delete(c)),
  );
}

// Guarda la pantalla con la hora, para decirte de cuándo es la copia.
async function guardarPagina(url, respuesta) {
  const cuerpo = await respuesta.blob();
  const cabeceras = new Headers(respuesta.headers);
  cabeceras.delete("set-cookie");
  cabeceras.set("x-diaclaro-guardada", new Date().toISOString());
  const cache = await caches.open(PAGINAS);
  await cache.put(
    url,
    new Response(cuerpo, { status: 200, headers: cabeceras }),
  );
  await recortar(PAGINAS, MAX_PAGINAS);
}

// Pide una pantalla a internet. Si sale bien, guarda la copia.
// Si te ha mandado a /login es que ya no hay sesión: borra todas las copias.
async function pedirYGuardar(request) {
  const respuesta = await fetch(request);
  const final = new URL(respuesta.url || request.url);
  if (respuesta.redirected && final.pathname.startsWith("/login")) {
    await caches.delete(PAGINAS);
  } else if (
    respuesta.ok &&
    !respuesta.redirected &&
    sePuedeGuardar(final) &&
    (respuesta.headers.get("content-type") || "").includes("text/html")
  ) {
    await guardarPagina(request.url, respuesta.clone());
  }
  return respuesta;
}

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
            .filter(
              (c) =>
                c.startsWith("diaclaro-") &&
                ![CACHE, PAGINAS, ARCHIVOS].includes(c),
            )
            .map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Abrir una pantalla: primero internet; si falla, la última copia.
  if (request.mode === "navigate") {
    event.respondWith(
      pedirYGuardar(request).catch(async () => {
        const copia = await caches.match(request.url, { cacheName: PAGINAS });
        if (copia) return copia;
        const guardada = await caches.match(SIN_CONEXION);
        return (
          guardada ||
          new Response("Sin conexión", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  // Archivos de la app (/_next/static) e iconos: no cambian nunca de nombre,
  // así que si ya están guardados se usan directamente.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ARCHIVOS).then(async (cache) => {
        const guardado = await cache.match(request);
        if (guardado) return guardado;
        const respuesta = await fetch(request);
        if (respuesta.ok) {
          await cache.put(request, respuesta.clone());
          recortar(ARCHIVOS, MAX_ARCHIVOS);
        }
        return respuesta;
      }),
    );
  }
});

// La app (app/componentes/registrar-sw.tsx) pide de vez en cuando guardar
// las pantallas principales, para tenerlas aunque no las hayas abierto hoy.
self.addEventListener("message", (event) => {
  const datos = event.data || {};
  if (datos.tipo === "guardar-pantallas" && Array.isArray(datos.urls)) {
    event.waitUntil(
      Promise.all(
        datos.urls.map((ruta) => {
          const url = new URL(ruta, self.location.origin);
          if (!sePuedeGuardar(url)) return null;
          return pedirYGuardar(
            new Request(url.href, { credentials: "same-origin" }),
          ).catch(() => null);
        }),
      ),
    );
  }
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
