import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archivarProyecto, eliminarProyecto } from "@/app/areas/actions";
import { FormProyecto } from "@/app/areas/form-proyecto";
import { AnadirEnProyecto } from "@/app/areas/anadir-en-proyecto";
import { MetasProyecto } from "@/app/areas/metas/metas-proyecto";
import { DocumentosDrive } from "@/app/areas/[id]/proyectos/[proyectoId]/documentos-drive";
import { ResumirConIA } from "@/app/areas/[id]/proyectos/[proyectoId]/resumir-con-ia";
import { NotaItem } from "@/app/bandeja/nota-item";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { iaDisponible } from "@/lib/ai/groq";
import {
  cargarOpcionesProyecto,
  leerArea,
  leerProyecto,
} from "@/lib/data/areas";
import {
  listarNotasDeProyecto,
  listarTareasDeProyecto,
} from "@/lib/data/bandeja";
import { listarRutinasDeProyecto } from "@/lib/data/rutinas";
import { describirRepeticion, leerRegla } from "@/lib/planner/agenda";
import { opcionesProyecto } from "@/lib/planner/areas";
import { agruparTareas } from "@/lib/planner/bandeja";
import { textoFranja, textoVeces } from "@/lib/planner/rutinas";

export const metadata: Metadata = { title: "Proyecto" };

// Un proyecto (o asignatura) por dentro: sus tareas y sus datos.
export default async function ProyectoPage({
  params,
  searchParams,
}: PageProps<"/areas/[id]/proyectos/[proyectoId]">) {
  const { id, proyectoId } = await params;
  const { google } = await searchParams;
  const [area, proyecto, tareas, rutinas, notas, { areas, proyectos }] =
    await Promise.all([
      leerArea(id),
      leerProyecto(proyectoId),
      listarTareasDeProyecto(proyectoId),
      listarRutinasDeProyecto(proyectoId),
      listarNotasDeProyecto(proyectoId),
      cargarOpcionesProyecto(),
    ]);
  if (!area || !proyecto || proyecto.area_id !== area.id) notFound();
  const opciones = opcionesProyecto(areas, proyectos);
  const { sinPlanificar, conFecha, hechas } = agruparTareas(tareas);
  const pendientes = [...conFecha, ...sinPlanificar];
  const ruta = `/areas/${area.id}/proyectos/${proyecto.id}`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href={`/areas/${area.id}`} className="text-sm underline">
        ← {area.name}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          {proyecto.name}
        </h1>
        <p className="text-sm text-muted">
          {proyecto.kind === "asignatura" ? "Asignatura" : "Proyecto"}
          {proyecto.archived_at && " · Archivado"}
          {proyecto.url && (
            <>
              {" · "}
              <a
                href={proyecto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Abrir enlace
              </a>
            </>
          )}
        </p>
        {proyecto.notes && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {proyecto.notes}
          </p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Añadir</h2>
        <AnadirEnProyecto proyectoId={proyecto.id} ruta={ruta} />
      </section>

      {rutinas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Se repite</h2>
          <ul className="flex flex-col gap-2">
            {rutinas.map((r) => (
              <li key={r.id} className={r.active ? "" : "opacity-60"}>
                <Link
                  href={`/ajustes/rutinas/${r.id}?proyecto=${proyecto.id}`}
                  className="card flex flex-col gap-1 p-4"
                >
                  <span className="break-words">{r.title}</span>
                  <span className="text-sm text-muted">
                    {[
                      r.repeat_rule
                        ? describirRepeticion(leerRegla(r.repeat_rule))
                        : "Cada día",
                      textoFranja(r),
                      r.times_per_day > 1 || r.duration_minutes
                        ? textoVeces(r)
                        : "",
                      r.active ? "" : "En pausa",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tareas</h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-muted">No hay tareas pendientes aquí.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendientes.map((t) => (
              <TareaItem key={t.id} tarea={t} grupos={opciones} />
            ))}
          </ul>
        )}
        {hechas.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-muted">
              Hechas ({hechas.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {hechas.map((t) => (
                <TareaItem key={t.id} tarea={t} grupos={opciones} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <MetasProyecto proyecto={proyecto} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Notas</h2>
        {notas.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no hay notas aquí. En Notas, abre «Editar» en una nota y elige
            este proyecto.
          </p>
        ) : (
          <>
            {iaDisponible() && <ResumirConIA proyectoId={proyecto.id} />}
            <ul className="flex flex-col gap-2">
              {notas.map((n) => (
                <NotaItem
                  key={n.id}
                  nota={n}
                  ver={n.archived_at ? "archivo" : "activas"}
                  grupos={opciones}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <DocumentosDrive
        proyectoId={proyecto.id}
        ruta={ruta}
        mensaje={typeof google === "string" ? google : undefined}
      />

      <details className="card">
        <summary className="cursor-pointer font-semibold">
          Cambiar nombre, tipo, enlace o notas
        </summary>
        <div className="mt-4">
          <FormProyecto areaId={area.id} proyecto={proyecto} />
        </div>
      </details>

      <section className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
        <form action={archivarProyecto}>
          <input type="hidden" name="id" value={proyecto.id} />
          <input
            type="hidden"
            name="archivar"
            value={proyecto.archived_at ? "no" : "si"}
          />
          <button type="submit" className="underline">
            {proyecto.archived_at
              ? "Recuperar"
              : "Archivar (por ejemplo, al aprobar)"}
          </button>
        </form>
        <form action={eliminarProyecto}>
          <input type="hidden" name="id" value={proyecto.id} />
          <input type="hidden" name="area_id" value={area.id} />
          <details>
            <summary className="cursor-pointer text-danger">Borrar</summary>
            <p className="mt-2 text-muted">
              Sus tareas no se borran: se quedan en Tareas, sin proyecto.
            </p>
            <button type="submit" className="mt-2 text-danger underline">
              Sí, borrarlo
            </button>
          </details>
        </form>
      </section>
    </main>
  );
}
