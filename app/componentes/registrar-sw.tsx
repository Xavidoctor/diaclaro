"use client";

import { useEffect } from "react";
import { guardarAvisoInstalar } from "@/app/instalar/aviso-instalar";

// Registra el service worker (public/sw.js) para poder recibir avisos.
// No se ve nada en pantalla. Si el navegador no lo admite, no pasa nada.
// También guarda el aviso «se puede instalar» de Chrome/Edge para que el
// botón de /instalar funcione aunque llegues a esa pantalla más tarde.
export function RegistrarSW() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", guardarAvisoInstalar);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }
    return () =>
      window.removeEventListener("beforeinstallprompt", guardarAvisoInstalar);
  }, []);
  return null;
}
