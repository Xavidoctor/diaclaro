"use client";

import { useEffect } from "react";
import {
  CLAVE_CAMBIOS,
  CLAVE_REVISAR,
  CLAVE_ULTIMA_CONEXION,
} from "@/lib/planner/cambios-sin-conexion";

// Al llegar a «Entrar» no hay sesión: borramos las copias de tus pantallas
// guardadas para verlas sin internet y los cambios sin enviar. Así, si otra
// persona entra en este aparato, no ve tus cosas.
export function BorrarCopias() {
  useEffect(() => {
    if ("caches" in window) caches.delete("diaclaro-paginas").catch(() => {});
    try {
      for (const clave of [
        "diaclaro:pantallas-guardadas",
        CLAVE_CAMBIOS,
        CLAVE_REVISAR,
        CLAVE_ULTIMA_CONEXION,
      ])
        localStorage.removeItem(clave);
    } catch {}
  }, []);
  return null;
}
