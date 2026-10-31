"use client";

import { useEffect } from "react";
import { guardarAvisoInstalar } from "@/app/instalar/aviso-instalar";
import { PANTALLAS_PRINCIPALES, tocaGuardar } from "@/lib/planner/sin-conexion";

const CLAVE_ULTIMA = "diaclaro:pantallas-guardadas";
// Aquí no hay sesión: no tiene sentido guardar copias.
const SIN_SESION = ["/login", "/auth", "/instalar"];

// Cada media hora, con internet, pide al service worker que guarde una copia
// de las pantallas principales para poder verlas sin conexión.
async function guardarPantallas() {
  if (!navigator.onLine) return;
  if (SIN_SESION.some((r) => location.pathname.startsWith(r))) return;
  let ultima: number | null = null;
  try {
    const guardada = localStorage.getItem(CLAVE_ULTIMA);
    ultima = guardada ? Number(guardada) : null;
  } catch {
    return; // sin localStorage (modo privado): no guardamos copias
  }
  if (!tocaGuardar(ultima, Date.now())) return;
  const registro = await navigator.serviceWorker.ready;
  registro.active?.postMessage({
    tipo: "guardar-pantallas",
    urls: PANTALLAS_PRINCIPALES,
  });
  localStorage.setItem(CLAVE_ULTIMA, String(Date.now()));
}

// Registra el service worker (public/sw.js) para recibir avisos y usar la app
// sin internet. No se ve nada en pantalla. Si el navegador no lo admite, no
// pasa nada.
// También guarda el aviso «se puede instalar» de Chrome/Edge para que el
// botón de /instalar funcione aunque llegues a esa pantalla más tarde.
export function RegistrarSW() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", guardarAvisoInstalar);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => guardarPantallas())
        .catch(() => {});
    }
    return () =>
      window.removeEventListener("beforeinstallprompt", guardarAvisoInstalar);
  }, []);
  return null;
}
