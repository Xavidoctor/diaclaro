import Link from "next/link";
import { EventoGoogle } from "@/app/agenda/evento-google";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import { claveGoogle } from "@/lib/planner/google-calendar";
import { Repeat } from "lucide-react";

// Lo que tienes un día SIN hora exacta (solo «por la tarde», o sin hora):
// va en una lista encima del día por horas (ver dia-por-horas.tsx).
// Tus compromisos y lo de Google Calendar.
export function ListaDelDia({
  ocurrencias,
  importadas,
}: {
  ocurrencias: Ocurrencia[];
  importadas: Map<string, string> | null; // tareas ya creadas desde Google
}) {
  if (ocurrencias.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {ocurrencias.map((o) => (
        <li key={`${o.eventoId}|${o.fechaOriginal}`}>
          {o.google ? (
            <EventoGoogle
              o={o}
              tareaId={importadas?.get(claveGoogle(o))}
              puedeImportar={importadas !== null}
            />
          ) : (
            <Link
              href={`/agenda/${o.eventoId}?dia=${o.fechaOriginal}`}
              className="card flex items-baseline gap-3 p-4"
            >
              <span className="w-28 shrink-0 text-sm text-muted">
                {textoHora(o)}
              </span>
              <span className="flex-1 break-words">{o.titulo}</span>
              {o.cambiada && (
                <span className="text-xs text-muted">Cambiado</span>
              )}
              {!o.cambiada && o.seRepite && (
                <Repeat
                  aria-label="Se repite"
                  className="size-4 shrink-0 self-center text-muted"
                />
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

// A dónde lleva tocar una tarea o rutina con hora. La tarea abre su día en
// la Agenda, en «Tareas de este día» (allí la marcas o la editas); la
// rutina, su ficha.
export function enlaceBloque(o: Ocurrencia): string {
  const { tipo, id } = o.bloque!;
  return tipo === "tarea"
    ? `/agenda?dia=${o.fecha}#tareas-del-dia`
    : `/ajustes/rutinas/${id}?desde=agenda`;
}
