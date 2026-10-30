// Service worker de DíaClaro: recibe los avisos aunque la app esté cerrada.
// (No guarda nada en caché: la app sigue funcionando igual que siempre).

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
