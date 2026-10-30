import {
  archivarNota,
  borrarNota,
  convertirEnTarea,
  editarNota,
  fijarNota,
  papeleraNota,
} from "@/app/bandeja/actions";
import { BotonAccion as Boton } from "@/app/bandeja/boton-accion";
import Link from "next/link";
import { badgeVariants } from "@/components/ui/badge";
import type { Nota, VistaNotas } from "@/lib/data/bandeja";
import { enlaceNotas } from "@/lib/planner/bandeja";
import { NOMBRE_TIPO, TIPOS_NOTA } from "@/lib/planner/etiquetas";

const fecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

// Una nota de la lista, con sus botones.
export function NotaItem({ nota, ver }: { nota: Nota; ver: VistaNotas }) {
  const enPapelera = Boolean(nota.deleted_at);
  const archivada = Boolean(nota.archived_at);

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap break-words">{nota.body}</p>
        {nota.pinned && (
          <span className="shrink-0 text-xs font-medium text-primary">
            Fijada
          </span>
        )}
      </div>

      {(nota.kind !== "nota" || nota.tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {nota.kind !== "nota" && (
            <Link
              href={enlaceNotas({ ver, tipo: nota.kind })}
              className={badgeVariants({ variant: "secondary" })}
            >
              {NOMBRE_TIPO[nota.kind]}
            </Link>
          )}
          {nota.tags.map((etiqueta) => (
            <Link
              key={etiqueta}
              href={enlaceNotas({ ver, etiqueta })}
              className={badgeVariants({ variant: "outline" })}
            >
              #{etiqueta}
            </Link>
          ))}
        </div>
      )}

      {nota.url && (
        <a
          href={nota.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-primary underline"
        >
          Abrir enlace
        </a>
      )}

      {nota.tasks.length > 0 && (
        <p className="text-sm text-muted">
          Convertida en tarea:{" "}
          {nota.tasks
            .map((t) => t.title + (t.done_at ? " (hecha)" : ""))
            .join(", ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-muted">
          {fecha.format(new Date(nota.created_at))}
        </span>

        {enPapelera ? (
          <>
            <Boton accion={papeleraNota} id={nota.id} campo={["tirar", "no"]}>
              Recuperar
            </Boton>
            <Boton accion={borrarNota} id={nota.id} peligro>
              Borrar para siempre
            </Boton>
          </>
        ) : (
          <>
            {nota.tasks.length === 0 && (
              <Boton accion={convertirEnTarea} id={nota.id}>
                Convertir en tarea
              </Boton>
            )}
            <Boton
              accion={fijarNota}
              id={nota.id}
              campo={["fijar", nota.pinned ? "no" : "si"]}
            >
              {nota.pinned ? "Desfijar" : "Fijar"}
            </Boton>
            <Boton
              accion={archivarNota}
              id={nota.id}
              campo={["archivar", archivada ? "no" : "si"]}
            >
              {archivada ? "Sacar del archivo" : "Archivar"}
            </Boton>
            <Boton accion={papeleraNota} id={nota.id} campo={["tirar", "si"]}>
              Papelera
            </Boton>
          </>
        )}
      </div>

      {!enPapelera && (
        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Editar
          </summary>
          <form action={editarNota} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="id" value={nota.id} />
            <label htmlFor={`editar-${nota.id}`} className="sr-only">
              Texto de la nota
            </label>
            <textarea
              id={`editar-${nota.id}`}
              name="texto"
              defaultValue={nota.body}
              required
              rows={4}
              className="input"
            />
            <div className="flex gap-2">
              <label className="flex w-36 flex-col gap-1 text-sm">
                Tipo
                <select
                  name="tipo"
                  defaultValue={nota.kind}
                  className="input px-2 py-2"
                >
                  {TIPOS_NOTA.map((t) => (
                    <option key={t} value={t}>
                      {NOMBRE_TIPO[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                Etiquetas (separadas por comas)
                <input
                  name="etiquetas"
                  defaultValue={nota.tags.join(", ")}
                  placeholder="ade, empleo"
                  className="input py-2"
                />
              </label>
            </div>
            <button type="submit" className="button-primary self-start py-2">
              Guardar cambios
            </button>
          </form>
        </details>
      )}
    </li>
  );
}
