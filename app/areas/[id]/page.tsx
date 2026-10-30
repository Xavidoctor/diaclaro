import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { archivarArea, eliminarArea } from "@/app/areas/actions";
import { FormArea } from "@/app/areas/form-area";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerArea, listarProyectos } from "@/lib/data/areas";
import { minutosDeCandidaturasPorArea } from "@/lib/data/candidaturas";
import { textoPresupuesto } from "@/lib/planner/areas";
import { lunesDe, textoSemanaCandidaturas } from "@/lib/planner/candidaturas";
import { hoyEn } from "@/lib/planner/fechas";

export const metadata: Metadata = { title: "Área" };

// Un área por dentro: sus proyectos (y asignaturas) y sus ajustes.
export default async function AreaPage({ params }: PageProps<"/areas/[id]">) {
  const { id } = await params;
  const [area, proyectos] = await Promise.all([
    leerArea(id),
    listarProyectos(id),
  ]);
  if (!area) notFound();
  const semanaCandidaturas = textoSemanaCandidaturas(
    await minutosDeLaSemana(area.id),
    area.personal_time ? null : area.weekly_minutes,
  );
  const activos = proyectos.filter((p) => !p.archived_at);
  const archivados = proyectos.filter((p) => p.archived_at);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/areas">Áreas</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="break-words text-3xl font-semibold tracking-tight">
            {area.name}
          </h1>
          <p className="text-sm text-muted">
            {textoPresupuesto(area)}
            {area.archived_at && " · Archivada"}
          </p>
          {semanaCandidaturas && (
            <p className="text-sm">
              {semanaCandidaturas}{" "}
              <Link href="/empleo" className="enlace">
                Ver candidaturas
              </Link>
            </p>
          )}
        </header>

        <section className="flex flex-col gap-3">
          <header className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Proyectos</h2>
            <Link
              href={`/areas/${area.id}/proyectos/nuevo`}
              className="button-primary gap-1 py-2 text-sm"
            >
              <Plus aria-hidden className="size-4" />
              Añadir
            </Link>
          </header>
          {activos.length === 0 ? (
            <p className="text-sm text-muted">
              Aún no hay proyectos aquí. Una asignatura también es un proyecto:
              elige «Asignatura» al añadirla.
            </p>
          ) : (
            <ListaProyectos areaId={area.id} proyectos={activos} />
          )}
          {archivados.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-muted">
                Archivados ({archivados.length})
              </summary>
              <div className="mt-2 opacity-60">
                <ListaProyectos areaId={area.id} proyectos={archivados} />
              </div>
            </details>
          )}
        </section>

        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Cambiar nombre u horas
          </summary>
          <div className="mt-4">
            <FormArea area={area} />
          </div>
        </details>

        <section className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
          <form action={archivarArea}>
            <input type="hidden" name="id" value={area.id} />
            <input
              type="hidden"
              name="archivar"
              value={area.archived_at ? "no" : "si"}
            />
            <button type="submit" className="underline">
              {area.archived_at ? "Recuperar esta área" : "Archivar esta área"}
            </button>
          </form>
          <form action={eliminarArea}>
            <input type="hidden" name="id" value={area.id} />
            <details>
              <summary className="cursor-pointer text-danger">
                Borrar esta área
              </summary>
              <p className="mt-2 text-muted">
                Se borran también todos sus proyectos (sus tareas se quedan en
                Tareas, sin proyecto). Si solo quieres dejarla de lado, mejor
                archívala.
              </p>
              <button type="submit" className="mt-2 text-danger underline">
                Sí, borrarla
              </button>
            </details>
          </form>
        </section>
      </main>
      <BarraInferior actual="/areas" />
    </>
  );
}

// Minutos dedicados a candidaturas de esta área desde el lunes.
// Si la tabla aún no está lista, cuenta 0 para no romper la pantalla.
async function minutosDeLaSemana(areaId: string) {
  try {
    const { timezone } = await leerAjustes();
    const hoy = hoyEn(timezone);
    const porArea = await minutosDeCandidaturasPorArea(lunesDe(hoy), hoy);
    return porArea.get(areaId) ?? 0;
  } catch {
    return 0;
  }
}

function ListaProyectos({
  areaId,
  proyectos,
}: {
  areaId: string;
  proyectos: Awaited<ReturnType<typeof listarProyectos>>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {proyectos.map((p) => (
        <li key={p.id} className="card flex items-center gap-3 p-4">
          <Link
            href={`/areas/${areaId}/proyectos/${p.id}`}
            className="flex flex-1 flex-col gap-1"
          >
            <span className="break-words">{p.name}</span>
            {p.kind === "asignatura" && (
              <span className="text-sm text-muted">Asignatura</span>
            )}
          </Link>
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="enlace text-sm"
            >
              Abrir enlace
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
