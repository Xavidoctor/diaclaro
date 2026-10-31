import Link from "next/link";
import { EventoGoogle } from "@/app/agenda/evento-google";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import { claveGoogle } from "@/lib/planner/google-calendar";
import { Repeat } from "lucide-react";

// Lo que tienes apuntado un día: tus compromisos, las tareas y rutinas con
// hora (los ratos que tienes reservados) y lo de Google Calendar.
// Se usa en los próximos días y en el día que eliges en el calendario.
export function ListaDelDia({
  ocurrencias,
  importadas,
}: {
  ocurrencias: Ocurrencia[];
  importadas: Map<string, string> | null; // tareas ya creadas desde Google
}) {
  if (ocurrencias.length === 0) {
    return <p className="text-sm text-muted">Nada apuntado.</p>;
  }
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
          ) : o.bloque ? (
            <Bloque o={o} />
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

// Una tarea o rutina con hora. La tarea abre su día en el calendario (allí
// puedes marcarla o editarla); la rutina abre su ficha.
function Bloque({ o }: { o: Ocurrencia }) {
  const { tipo, id, hecha } = o.bloque!;
  const href =
    tipo === "tarea"
      ? `/agenda?dia=${o.fecha}#dia-elegido`
      : `/ajustes/rutinas/${id}?desde=agenda`;
  return (
    <Link href={href} className="card flex items-baseline gap-3 p-4">
      <span className="w-28 shrink-0 text-sm text-muted">{textoHora(o)}</span>
      <span
        className={`flex-1 break-words ${hecha ? "text-muted line-through" : ""}`}
      >
        {o.titulo}
      </span>
      <span className="text-xs text-muted">
        {tipo === "tarea" ? "Tarea" : "Rutina"}
      </span>
    </Link>
  );
}
