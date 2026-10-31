import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Plus } from "lucide-react";
import { crearSugeridas, moverArea } from "@/app/areas/actions";
import { FormHorasLibres } from "@/app/areas/form-horas-libres";
import { AyudaPantalla } from "@/app/componentes/ayuda-guia";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { contarProyectosPorArea, listarAreas } from "@/lib/data/areas";
import { leerHorasDescanso } from "@/lib/data/horas-libres";
import { cargarResumenSemana } from "@/lib/data/resumen-semana";
import { leerSecciones } from "@/lib/data/secciones";
import {
  AREAS_SUGERIDAS,
  resumenSemana,
  textoHoras,
  textoPresupuesto,
  type Area,
} from "@/lib/planner/areas";
import { lunesDe } from "@/lib/planner/candidaturas";
import {
  barraHoras,
  minutosLibresSemana,
  type HorasDescanso,
} from "@/lib/planner/horas-libres";
import {
  porcentaje,
  textoFila,
  type FilaArea,
} from "@/lib/planner/resumen-semana";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Áreas" };

// Áreas: las grandes partes de tu vida, con sus proyectos y sus horas.
export default async function AreasPage() {
  const { timezone } = await leerAjustes();
  const [areas, proyectos, secciones, horasDescanso, estaSemana] =
    await Promise.all([
      listarAreas(),
      contarProyectosPorArea(),
      leerSecciones(),
      leerHorasDescanso(),
      // Lo que llevas esta semana en cada área. Si falla, la lista sale igual.
      cargarResumenSemana(lunesDe(await diaDeHoy()), timezone).catch(
        (error) => {
          console.error(error);
          return null;
        },
      ),
    ]);
  const filas = new Map(estaSemana?.filas.map((f) => [f.area.id, f]));
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

        {/* Empleo solo sale si lo usas o lo enciendes en Ajustes. */}
        {secciones.empleo && (
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
        )}

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
            <HorasLibres
              horas={horasDescanso}
              compromiso={semana.compromiso}
              personal={semana.personal}
            />
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
            <ListaAreas
              areas={activas}
              proyectos={proyectos}
              filas={filas}
              ordenable
            />
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

// Barra «Horas libres a la semana»: lo que has repartido entre tus áreas
// frente a las horas que tienes libres (24 h − sueño − descansos, por 7).
function HorasLibres({
  horas,
  compromiso,
  personal,
}: {
  horas: HorasDescanso;
  compromiso: number;
  personal: number;
}) {
  const barra = barraHoras(minutosLibresSemana(horas), compromiso + personal);
  const numero = (h: number) => String(h).replace(".", ",");
  return (
    <section className="card flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">Horas libres a la semana</h2>
        <span className="text-sm text-muted">
          {textoHoras(barra.repartidas)} de {textoHoras(barra.libres)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Horas repartidas entre tus áreas"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barra.porcentaje}
        className="h-2.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={`h-full rounded-full ${barra.teHasPasado > 0 ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${barra.porcentaje}%` }}
        />
      </div>
      <p className="text-sm">
        {barra.repartidas === 0
          ? "Aún no has puesto horas a ninguna área."
          : barra.teHasPasado > 0
            ? `Te has pasado ${textoHoras(barra.teHasPasado)}: has dado a tus áreas más horas de las que tienes libres.`
            : `Te quedan ${textoHoras(barra.quedan)} sin repartir.`}
      </p>
      {personal > 0 && (
        <p className="text-sm text-muted">
          {textoHoras(compromiso)} de compromiso y hasta {textoHoras(personal)}{" "}
          de tiempo personal.
        </p>
      )}
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">
          Cuento {numero(horas.sueno)} h de sueño y {numero(horas.descanso)} h
          de descansos al día · Cambiar
        </summary>
        <FormHorasLibres
          inicial={{
            sueno: numero(horas.sueno),
            descanso: numero(horas.descanso),
          }}
        />
      </details>
    </section>
  );
}

function ListaAreas({
  areas,
  proyectos,
  filas,
  ordenable,
}: {
  areas: Area[];
  proyectos: Map<string, number>;
  filas?: Map<string, FilaArea>;
  ordenable?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {areas.map((a, i) => {
        const n = proyectos.get(a.id) ?? 0;
        const fila = filas?.get(a.id);
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
              {/* Tu progreso de esta semana en el área, en pequeño. */}
              {fila && <ProgresoArea fila={fila} />}
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

// Una barra fina con lo que llevas esta semana frente a sus horas.
function ProgresoArea({ fila }: { fila: FilaArea }) {
  const presupuesto = fila.area.weekly_minutes;
  return (
    <span className="flex flex-col gap-1 pt-1">
      {presupuesto ? (
        <span
          aria-hidden
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${porcentaje(fila.total, presupuesto)}%` }}
          />
        </span>
      ) : null}
      <span className="text-xs text-muted">Esta semana: {textoFila(fila)}</span>
    </span>
  );
}
