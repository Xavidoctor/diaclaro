"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) para poder recibir avisos.
// No se ve nada en pantalla. Si el navegador no lo admite, no pasa nada.
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}
