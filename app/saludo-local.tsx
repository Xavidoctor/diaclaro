"use client";

import { useSyncExternalStore } from "react";
import { saludo } from "@/lib/saludo";
import { saludoConNombre } from "@/lib/planner/perfil";

// La hora se lee en el navegador para usar la zona horaria del móvil u ordenador,
// no la del servidor. Mientras carga en el servidor, se deja el hueco vacío.
const suscribir = () => () => {};

// Con nombre: «Buenas tardes, Xavi». Sin nombre: solo «Buenas tardes».
export function SaludoLocal({ nombre = null }: { nombre?: string | null }) {
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
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
        {dia}
      </span>
      {saludoConNombre(saludo(ahora.getHours()), nombre)}
    </>
  );
}
