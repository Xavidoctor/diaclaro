import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Plus } from "lucide-react";
import { crearSugeridas, moverArea } from "@/app/areas/actions";
import { AyudaPantalla } from "@/app/componentes/ayuda-guia";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { contarProyectosPorArea, listarAreas } from "@/lib/data/areas";
import {
  AREAS_SUGERIDAS,
  resumenSemana,
  textoHoras,
  textoPresupuesto,
  type Area,
} from "@/lib/planner/areas";

export const metadata: Metadata = { title: "Áreas" };

// Áreas: las grandes partes de tu vida, con sus proyectos y sus horas.
export default async function AreasPage() {
  const [areas, proyectos] = await Promise.all([
    listarAreas(),
    contarProyectosPorArea(),
  ]);
  const activas = areas.filter((a) => !a.archived_at);
  const archivadas = areas.filter((a) => a.archived_at);
  const semana = resumenSemana(areas);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Áreas</h1>
          <Link
            href="/areas/nueva"
            data-guia="areas-anadir"
            className="button-primary gap-1 py-2 text-sm"
          >
            <Plus aria-hidden className="size-4" />
            Añadir
          </Link>
        </header>

        <AyudaPantalla seccion="areas" />

        <Link
          href="/empleo"
          className="card flex items-center justify-between gap-3 p-4"
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Candidaturas de empleo</span>
            <span className="text-sm text-muted">
              Las ofertas a las que te presentas y sus seguimientos
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
        </Link>

        {areas.length === 0 ? (
          <section className="card flex flex-col gap-3">
            <p>
              Aún no tienes áreas. Puedes empezar con estas y luego cambiarlas,
              o crear las tuyas con «Añadir»:
            </p>
            <p className="text-sm text-muted">
              {AREAS_SUGERIDAS.map((a) => a.name).join(" · ")}
            </p>
            <p className="text-sm text-muted">
              Se crean sin horas: las horas de cada semana las pones tú.
            </p>
            <form action={crearSugeridas}>
              <button type="submit" className="button-primary py-2 text-sm">
                Crear estas áreas
              </button>
            </form>
          </section>
        ) : (
          <>
            <p className="text-sm text-muted">
              {semana.compromiso > 0
                ? `Te has propuesto ${textoHoras(semana.compromiso)} a la semana`
                : "Aún no has puesto horas a ninguna área"}
              {semana.personal > 0 &&
                `, más hasta ${textoHoras(semana.personal)} de tiempo personal`}
              .
            </p>
            <Link
              href="/areas/semana"
              className="card flex items-center justify-between gap-3 p-4"
            >
              <span className="flex flex-col gap-1">
                <span className="font-medium">Tu semana</span>
                <span className="text-sm text-muted">
                  Cuánto llevas en cada área frente a sus horas
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-muted"
              />
            </Link>
            <ListaAreas areas={activas} proyectos={proyectos} ordenable />
            {archivadas.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm text-muted">
                  Archivadas ({archivadas.length})
                </summary>
                <div className="mt-2">
                  <ListaAreas areas={archivadas} proyectos={proyectos} />
                </div>
              </details>
            )}
          </>
        )}
      </main>
      <BarraInferior actual="/areas" />
    </>
  );
}

function ListaAreas({
  areas,
  proyectos,
  ordenable,
}: {
  areas: Area[];
  proyectos: Map<string, number>;
  ordenable?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {areas.map((a, i) => {
        const n = proyectos.get(a.id) ?? 0;
        return (
          <li
            key={a.id}
            className={`card flex items-center gap-3 p-4 ${a.archived_at ? "opacity-60" : ""}`}
          >
            <Link
              href={`/areas/${a.id}`}
              className="flex flex-1 flex-col gap-1"
            >
              <span className="break-words font-medium">{a.name}</span>
              <span className="text-sm text-muted">
                {textoPresupuesto(a)} ·{" "}
                {n === 1 ? "1 proyecto" : `${n} proyectos`}
              </span>
            </Link>
            {ordenable && (
              <div className="flex flex-col">
                <BotonMover area={a} vecina={areas[i - 1]} etiqueta="Subir" />
                <BotonMover area={a} vecina={areas[i + 1]} etiqueta="Bajar" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Botón para subir o bajar un área (no se muestra en los bordes de la lista).
function BotonMover({
  area,
  vecina,
  etiqueta,
}: {
  area: Area;
  vecina?: Area;
  etiqueta: "Subir" | "Bajar";
}) {
  const Icono = etiqueta === "Subir" ? ChevronUp : ChevronDown;
  // En los bordes se deja el hueco vacío para que las flechas no bailen.
  if (!vecina) return <span aria-hidden className="block size-9" />;
  return (
    <form action={moverArea}>
      <input type="hidden" name="id" value={area.id} />
      <input
        type="hidden"
        name="paso"
        value={etiqueta === "Subir" ? "subir" : "bajar"}
      />
      <button
        type="submit"
        aria-label={etiqueta}
        className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-secondary"
      >
        <Icono aria-hidden className="size-5" />
      </button>
    </form>
  );
}
