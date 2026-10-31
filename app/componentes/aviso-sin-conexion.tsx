"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";
import { deCuandoEsLaCopia } from "@/lib/planner/sin-conexion";

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

// Franja de arriba que sale solo cuando no hay internet: dice que lo que ves
// es la copia guardada en este aparato y de qué hora es.
export function AvisoSinConexion() {
  const sinConexion = useSyncExternalStore(
    suscribir,
    () => !navigator.onLine,
    () => false,
  );
  const [deCuando, setDeCuando] = useState<string | null>(null);

  useEffect(() => {
    if (!sinConexion || !("caches" in window)) return;
    caches
      .match(location.href, { cacheName: "diaclaro-paginas" })
      .then((copia) =>
        setDeCuando(
          deCuandoEsLaCopia(copia?.headers.get("x-diaclaro-guardada") ?? null, new Date()),
        ),
      )
      .catch(() => {});
  }, [sinConexion]);

  if (!sinConexion) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center gap-2 bg-secondary px-4 py-2 text-sm text-foreground"
    >
      <CloudOff aria-hidden className="size-4 shrink-0 text-primary" />
      <p>
        <strong>Sin conexión.</strong> Estás viendo la copia guardada en este
        aparato{deCuando ? ` (${deCuando})` : ""}. Lo que cambies puede no
        guardarse hasta que vuelva internet.
      </p>
    </div>
  );
}
