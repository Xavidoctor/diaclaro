import { borrarTarea, marcarTarea, papeleraTarea } from "@/app/bandeja/actions";
import { BotonAccion } from "@/app/bandeja/boton-accion";
import { FichaTarea } from "@/app/bandeja/ficha-tarea";
import type { Tarea } from "@/lib/data/bandeja";

const fecha = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// "2026-11-03" → "mar, 3 nov". Las fechas de tarea no llevan hora, por eso se leen en UTC.
function verFecha(dia: string) {
  return fecha.format(new Date(`${dia}T00:00:00Z`));
}

// Una tarea de la lista: casilla para marcarla hecha y ficha para editarla.
export function TareaItem({ tarea }: { tarea: Tarea }) {
  const hecha = Boolean(tarea.done_at);
  const enPapelera = Boolean(tarea.deleted_at);

  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex items-start gap-3">
        {!enPapelera && (
          <form action={marcarTarea}>
            <input type="hidden" name="id" value={tarea.id} />
            <input type="hidden" name="hecha" value={hecha ? "no" : "si"} />
            <button
              type="submit"
              aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecha"}
              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                hecha
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {hecha ? "✓" : ""}
            </button>
          </form>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <p
            className={`break-words ${hecha ? "text-muted line-through" : ""}`}
          >
            {tarea.title}
          </p>
          {(tarea.due_date || tarea.estimated_minutes) && (
            <p className="text-sm text-muted">
              {[
                tarea.due_date && verFecha(tarea.due_date),
                tarea.estimated_minutes && `${tarea.estimated_minutes} min`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {tarea.details && (
            <p className="whitespace-pre-wrap break-words text-sm text-muted">
              {tarea.details}
            </p>
          )}
        </div>
      </div>

      {enPapelera ? (
        <div className="flex gap-4 text-sm">
          <BotonAccion
            accion={papeleraTarea}
            id={tarea.id}
            campo={["tirar", "no"]}
          >
            Recuperar
          </BotonAccion>
          <BotonAccion accion={borrarTarea} id={tarea.id} peligro>
            Borrar para siempre
          </BotonAccion>
        </div>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Editar
          </summary>
          <FichaTarea tarea={tarea} />
          <div className="mt-2 text-sm">
            <BotonAccion
              accion={papeleraTarea}
              id={tarea.id}
              campo={["tirar", "si"]}
            >
              Mover a la papelera
            </BotonAccion>
          </div>
        </details>
      )}
    </li>
  );
}
