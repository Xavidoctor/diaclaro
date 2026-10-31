import { Bell, Check } from "lucide-react";
import { FormMeta } from "@/app/areas/metas/form-meta";
import { eliminarMeta, marcarMetaHecha } from "@/app/areas/metas/actions";
import { diaDeHoy } from "@/lib/data/dia-activo";
import { listarMetasDeProyecto } from "@/lib/data/metas";
import type { Proyecto } from "@/lib/planner/areas";
import { fechaCorta } from "@/lib/planner/fechas";
import {
  NOMBRE_TIPO,
  textoAviso,
  textoFalta,
  tiposParaProyecto,
  type Meta,
  type TipoMeta,
} from "@/lib/planner/metas";

// Bloque «Metas» de un proyecto (en una asignatura: entregas y exámenes).
// Si la tabla aún no existe (falta ejecutar la migración), no se muestra.
export async function MetasProyecto({ proyecto }: { proyecto: Proyecto }) {
  let metas: Meta[];
  let hoy: string;
  try {
    // El día cuenta desde «Despierto» hasta «Me voy a dormir».
    [metas, hoy] = await Promise.all([
      listarMetasDeProyecto(proyecto.id),
      diaDeHoy(),
    ]);
  } catch {
    return null;
  }
  const tipos = tiposParaProyecto(proyecto.kind);
  const pendientes = metas.filter((m) => !m.done_at);
  const hechas = metas.filter((m) => m.done_at);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {proyecto.kind === "asignatura" ? "Entregas y exámenes" : "Metas"}
      </h2>
      {pendientes.length === 0 ? (
        <p className="text-sm text-muted">
          {proyecto.kind === "asignatura"
            ? "Apunta aquí tus entregas y exámenes, con su fecha si ya la sabes."
            : "Apunta aquí lo que quieres conseguir, con su fecha si ya la sabes."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendientes.map((m) => (
            <FilaMeta key={m.id} meta={m} hoy={hoy} tipos={tipos} />
          ))}
        </ul>
      )}
      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          + Añadir
        </summary>
        <div className="mt-3">
          <FormMeta proyectoId={proyecto.id} tipos={tipos} />
        </div>
      </details>
      {hechas.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Conseguidas ({hechas.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {hechas.map((m) => (
              <FilaMeta key={m.id} meta={m} hoy={hoy} tipos={tipos} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// Lo que se ve de una meta: tipo y cuánto falta. Tocando «Cambiar» se edita.
function FilaMeta({
  meta,
  hoy,
  tipos,
}: {
  meta: Meta;
  hoy: string;
  tipos: TipoMeta[];
}) {
  const hecha = Boolean(meta.done_at);
  const pasada = !hecha && meta.due_date !== null && meta.due_date < hoy;
  const aviso = hecha ? null : textoAviso(meta.remind_at);

  return (
    <li id={`meta-${meta.id}`} className="card flex flex-col gap-2 p-4">
      <div className="flex items-start gap-3">
        <form action={marcarMetaHecha}>
          <input type="hidden" name="id" value={meta.id} />
          <input type="hidden" name="hecha" value={hecha ? "no" : "si"} />
          <button
            type="submit"
            aria-label={hecha ? "Volver a dejarla pendiente" : "Conseguida"}
            className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 border-border"
          >
            {hecha && <Check size={16} aria-hidden />}
          </button>
        </form>
        <div className="flex flex-1 flex-col gap-1">
          <span
            className={`break-words ${hecha ? "text-muted line-through" : ""}`}
          >
            {meta.title}
          </span>
          <span className="text-sm text-muted">
            {tipos.length > 1 || meta.kind !== "meta"
              ? `${NOMBRE_TIPO[meta.kind]} · `
              : ""}
            {meta.due_date ? (
              <span className={pasada ? "text-danger" : ""}>
                {fechaCorta(meta.due_date)}
                {!hecha && ` · ${textoFalta(meta.due_date, hoy)}`}
              </span>
            ) : (
              "Sin fecha"
            )}
          </span>
          {aviso && (
            <span className="flex items-center gap-1 text-sm text-muted">
              <Bell size={14} aria-hidden />
              {aviso}
            </span>
          )}
        </div>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted">Cambiar</summary>
        <div className="mt-3 flex flex-col gap-4">
          <FormMeta proyectoId={meta.project_id} tipos={tipos} meta={meta} />
          <form action={eliminarMeta}>
            <input type="hidden" name="id" value={meta.id} />
            <button type="submit" className="text-sm text-danger underline">
              Borrar
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}
