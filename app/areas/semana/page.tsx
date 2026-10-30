import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { leerAjustes } from "@/lib/data/ajustes";
import { cargarResumenSemana } from "@/lib/data/resumen-semana";
import { leerFechaParam } from "@/lib/planner/agenda";
import { textoHoras } from "@/lib/planner/areas";
import { lunesDe } from "@/lib/planner/candidaturas";
import { fechaCorta, hoyEn, sumarDias } from "@/lib/planner/fechas";
import {
  porcentaje,
  textoDesglose,
  textoFila,
  type FilaArea,
} from "@/lib/planner/resumen-semana";

export const metadata: Metadata = { title: "Tu semana" };

// Tu semana por áreas: el tiempo que has dado a cada una frente a las horas
// que te propusiste. /areas/semana?semana=2026-10-19 enseña otra semana.
export default async function SemanaPage({
  searchParams,
}: PageProps<"/areas/semana">) {
  const params = await searchParams;
  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  const estaSemana = lunesDe(hoy);
  // Siempre empezamos en lunes y nunca en una semana que aún no ha llegado.
  const pedido = lunesDe(leerFechaParam(params.semana, hoy));
  const desde = pedido > estaSemana ? estaSemana : pedido;
  const hasta = sumarDias(desde, 6);
  const resumen = await cargarResumenSemana(desde, timezone);
  const esEsta = desde === estaSemana;

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/areas">Áreas</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {esEsta ? "Esta semana" : "Tu semana"}
          </h1>
          <p className="text-sm text-muted">
            Del lunes {fechaCorta(desde)} al domingo {fechaCorta(hasta)}
            {resumen.total > 0 &&
              ` · ${textoHoras(resumen.total)} apuntadas en total`}
          </p>
        </header>

        <nav aria-label="Cambiar de semana" className="flex gap-4 text-sm">
          <Link
            href={`/areas/semana?semana=${sumarDias(desde, -7)}`}
            className="enlace inline-flex min-h-11 items-center gap-0.5"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Semana anterior
          </Link>
          {!esEsta && (
            <Link
              href="/areas/semana"
              className="enlace ml-auto inline-flex min-h-11 items-center gap-0.5"
            >
              Esta semana
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          )}
        </nav>

        {resumen.filas.length === 0 ? (
          <p className="card text-sm">
            Aún no tienes áreas.{" "}
            <Link href="/areas" className="enlace">
              Crea tus áreas
            </Link>{" "}
            y ponles horas para ver aquí cómo va tu semana.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {resumen.filas.map((f) => (
              <FilaResumen key={f.area.id} fila={f} />
            ))}
          </ul>
        )}

        {resumen.sinArea > 0 && (
          <p className="text-sm text-muted">
            Además, {textoHoras(resumen.sinArea)} sin área: foco o tareas que
            no están en ningún proyecto. Ponles proyecto para que cuenten.
          </p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-muted">
            ¿De dónde salen estas horas?
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
            <li>
              Foco: el temporizador, cuando lo usas en una tarea de un
              proyecto.
            </li>
            <li>
              Tareas: lo que contestas en «¿Cuánto has tardado?» al terminar
              una tarea de un proyecto (sin repetir lo ya medido con el
              temporizador).
            </li>
            <li>Candidaturas: los minutos que apuntas en su historial.</li>
          </ul>
          <p className="mt-2 text-muted">
            Lo que no apuntas no cuenta: DíaClaro no se inventa tu tiempo.
          </p>
        </details>
      </main>
      <BarraInferior actual="/areas" />
    </>
  );
}

function FilaResumen({ fila }: { fila: FilaArea }) {
  const desglose = textoDesglose(fila);
  const lleno = porcentaje(fila.total, fila.area.weekly_minutes);
  return (
    <li className="card flex flex-col gap-2 p-4">
      <Link
        href={`/areas/${fila.area.id}`}
        className="flex items-baseline justify-between gap-3"
      >
        <span className="break-words font-medium">{fila.area.name}</span>
        {fila.area.personal_time && (
          <span className="text-xs text-muted">Tiempo personal</span>
        )}
      </Link>
      <p className="text-sm">{textoFila(fila)}</p>
      {fila.area.weekly_minutes ? (
        <div
          role="progressbar"
          aria-label={`Horas de ${fila.area.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={lleno}
          className="h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className={`h-full rounded-full ${
              fila.estado === "pasado" ? "bg-danger" : "bg-primary"
            }`}
            style={{ width: `${lleno}%` }}
          />
        </div>
      ) : null}
      {desglose && <p className="text-xs text-muted">{desglose}</p>}
    </li>
  );
}
