"use client";

import { useEffect } from "react";

// Al llegar a «Entrar» no hay sesión: borramos las copias de tus pantallas
// guardadas para verlas sin internet. Así, si otra persona entra en este
// aparato, no ve tus cosas.
export function BorrarCopias() {
  useEffect(() => {
    if ("caches" in window) caches.delete("diaclaro-paginas").catch(() => {});
    try {
      localStorage.removeItem("diaclaro:pantallas-guardadas");
    } catch {}
  }, []);
  return null;
}
