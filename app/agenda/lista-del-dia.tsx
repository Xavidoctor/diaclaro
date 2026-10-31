import Link from "next/link";
import { BloqueMovible } from "@/app/agenda/bloque-movible";
import { EventoGoogle } from "@/app/agenda/evento-google";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import { claveGoogle } from "@/lib/planner/google-calendar";
import { ratosFijos, sePuedeMover } from "@/lib/planner/mover-dia";
import { Repeat } from "lucide-react";

// Lo que tienes apuntado un día: tus compromisos, las tareas y rutinas con
// hora (los ratos que tienes reservados) y lo de Google Calendar.
// Se usa en los próximos días y en el día que eliges en el calendario.
// Lo flexible (tareas y rutinas con hora sin «Hora fija») se mantiene
// pulsado y se mueve arriba o abajo para cambiarle la hora; lo demás es fijo.
// En los días que ya pasaron no se mueve nada.
export function ListaDelDia({
  ocurrencias,
  importadas,
  sePuedeOrdenar,
}: {
  ocurrencias: Ocurrencia[];
  importadas: Map<string, string> | null; // tareas ya creadas desde Google
  sePuedeOrdenar: boolean;
}) {
  if (ocurrencias.length === 0) {
    return <p className="text-sm text-muted">Nada apuntado.</p>;
  }
  const fijos = ratosFijos(ocurrencias);
  return (
    <ul className="flex flex-col gap-2">
      {ocurrencias.map((o) => (
        // Con la hora en la clave: al guardar una hora nueva, la tarjeta empieza de cero.
        <li key={`${o.eventoId}|${o.fechaOriginal}|${o.horaInicio}`}>
          {o.google ? (
            <EventoGoogle
              o={o}
              tareaId={importadas?.get(claveGoogle(o))}
              puedeImportar={importadas !== null}
            />
          ) : o.bloque ? (
            <BloqueMovible
              o={o}
              href={enlaceBloque(o)}
              movible={sePuedeOrdenar && sePuedeMover(o)}
              fijos={fijos}
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

// Una tarea o rutina con hora. La tarea abre su día en el calendario, en
// «Tareas de este día» (allí puedes marcarla o editarla); la rutina, su ficha.
function enlaceBloque(o: Ocurrencia): string {
  const { tipo, id } = o.bloque!;
  return tipo === "tarea"
    ? `/agenda?dia=${o.fecha}#tareas-del-dia`
    : `/ajustes/rutinas/${id}?desde=agenda`;
}
