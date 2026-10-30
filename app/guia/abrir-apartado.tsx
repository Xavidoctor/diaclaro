"use client";

import { useEffect } from "react";

// Si llegas con /guia#bandeja, abre ese apartado para que no tengas que tocarlo.
export function AbrirApartado() {
  useEffect(() => {
    function abrir() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const apartado = document.getElementById(id)?.querySelector("details");
      if (apartado) apartado.open = true;
    }
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);
  return null;
}
