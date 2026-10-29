"use client";

import { useSyncExternalStore } from "react";
import { saludo } from "@/lib/saludo";

// La hora se lee en el navegador para usar la zona horaria del móvil u ordenador,
// no la del servidor. Mientras carga en el servidor, se deja el hueco vacío.
const suscribir = () => () => {};

export function SaludoLocal() {
  const enNavegador = useSyncExternalStore(
    suscribir,
    () => true,
    () => false,
  );
  if (!enNavegador) return <span className="invisible">Hola</span>;

  const ahora = new Date();
  const dia = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(ahora);

  return (
    <>
      <span className="block text-sm font-normal text-muted first-letter:uppercase">
        {dia}
      </span>
      {saludo(ahora.getHours())}
    </>
  );
}
