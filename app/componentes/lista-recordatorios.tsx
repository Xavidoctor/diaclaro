"use client";

import { useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { Apuntar } from "@/app/habitos/apuntar";
import { horaEn } from "@/lib/planner/fechas";
import {
  horaCorta,
  pendientesALaHora,
  type Habito,
} from "@/lib/planner/habitos";

export type HabitoARecordar = Pick<
  Habito,
  "id" | "title" | "unit" | "direction" | "remind_at"
>;

// ---- La hora, en tu zona horaria, que se pone al día cada 30 segundos ----
function relojCadaRato(avisar: () => void) {
  const id = window.setInterval(avisar, 30_000);
  // Al volver a la app (por ejemplo, tras bloquear el móvil) se pone al día enseguida.
  document.addEventListener("visibilitychange", avisar);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", avisar);
  };
}

// ---- «Ahora no»: los recordatorios que has quitado hoy, en este navegador ----
// Se guardan por día, así mañana vuelven a salir.
const oyentes = new Set<() => void>();
const enMemoria = new Map<string, string>();
const clave = (hoy: string) => `diaclaro.recordatorios.${hoy}`;

function leerQuitados(hoy: string): string {
  try {
    return localStorage.getItem(clave(hoy)) ?? "";
  } catch {
    return enMemoria.get(hoy) ?? "";
  }
}

function quitar(hoy: string, id: string) {
  const ids = new Set(leerQuitados(hoy).split(",").filter(Boolean));
  ids.add(id);
  const texto = [...ids].join(",");
  enMemoria.set(hoy, texto);
  try {
    localStorage.setItem(clave(hoy), texto);
  } catch {
    // Sin almacenamiento: se queda en memoria hasta que recargues.
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

export function ListaRecordatorios({
  hoy,
  zona,
  habitos,
}: {
  hoy: string;
  zona: string;
  habitos: HabitoARecordar[];
}) {
  // En el servidor no se sabe la hora del momento: hasta cargar, no sale nada.
  const hora = useSyncExternalStore(
    relojCadaRato,
    () => horaEn(zona),
    () => null,
  );
  const quitados = useSyncExternalStore(
    suscribirse,
    () => leerQuitados(hoy),
    () => "",
  ).split(",");
  if (hora === null) return null;

  const pendientes = pendientesALaHora(habitos, hora).filter(
    (h) => !quitados.includes(h.id),
  );
  if (pendientes.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Recordatorios">
      <ul className="flex flex-col gap-2">
        {pendientes.map((h) => (
          <li key={h.id} className="card flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <Bell aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="break-words font-medium">{h.title}</span>
                <span className="text-sm text-muted">
                  Recordatorio de las {horaCorta(h.remind_at as string)}. Hoy
                  aún no has apuntado nada. ¿Lo apuntas?
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => quitar(hoy, h.id)}
                className="py-2 text-sm text-muted underline"
              >
                Ahora no
              </button>
              <Apuntar
                id={h.id}
                unidad={h.unit}
                conDetalle={false}
                ninguno={h.direction === "menos"}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
