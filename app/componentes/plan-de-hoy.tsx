import Link from "next/link";
import { AbrirEnlace } from "@/app/componentes/abrir-enlace";
import { PendientesDeHoy } from "@/app/componentes/pendientes-de-hoy";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas } from "@/lib/data/bandeja";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { textoDuracion } from "@/lib/planner/carga";
import { listaDeHoy, tareasHechasHoy } from "@/lib/planner/pendientes-hoy";
import {
  marcarTiempoPersonal,
  motivoOrden,
  ordenarTareas,
  type TareaParaPlan,
} from "@/lib/planner/plan";
import { filasDeHoy, type RutinaDelDia } from "@/lib/planner/rutinas";

// Tarjeta de Hoy con tu plan: la siguiente tarea y, debajo, todo lo que te
// queda hoy en una lista para ir tachando (tus 3 prioridades primero), con
// el contador «1/2 pendientes» y el botón «Añadir tarea».
// El orden se calcula en lib/planner/plan.ts (sin IA).
export async function PlanDeHoy({
  hoy,
  rutinas,
  zona,
}: {
  hoy: string;
  rutinas: RutinaDelDia[];
  zona: string;
}) {
  const [tareas, { areas, proyectos }] = await Promise.all([
    listarTareas(false),
    cargarOpcionesProyecto(),
  ]);
  const { atrasadas, deHoy, enMarcha, sinDia } = tareasParaHoy(tareas, hoy);
  const ordenadas = ordenarTareas(
    marcarTiempoPersonal([...atrasadas, ...deHoy], areas, proyectos),
    hoy,
  );
  const siguiente = ordenadas[0] ?? null;
  const lista = listaDeHoy({
    plan: ordenadas,
    rutinas: filasDeHoy(rutinas),
    enMarcha,
    sinDia,
    hechas: tareasHechasHoy(tareas, hoy, zona),
    hoy,
  });

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Tu plan de hoy</h2>
        <span className="flex gap-3 text-sm">
          <Link href="/organizar" className="enlace">
            Organízame el día
          </Link>
          <Link href="/dia-dificil" className="enlace">
            Día difícil
          </Link>
        </span>
      </header>

      {siguiente && (
        <div className="card flex flex-col gap-3 border-primary p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Siguiente tarea
          </p>
          <p className="text-xl font-semibold break-words">{siguiente.title}</p>
          <p className="text-sm text-muted">{detalle(siguiente, hoy)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/foco?tarea=${siguiente.id}`}
              className="button-primary py-2 text-sm"
            >
              Concentrarme
            </Link>
            {siguiente.url && <AbrirEnlace url={siguiente.url} />}
          </div>
        </div>
      )}

      <PendientesDeHoy lista={lista} hoy={hoy} />
    </section>
  );
}

// "Importancia alta · 45 min", o sin minutos si no los has puesto.
function detalle(t: TareaParaPlan, hoy: string) {
  const motivo = motivoOrden(t, hoy);
  return t.estimated_minutes
    ? `${motivo} · ${textoDuracion(t.estimated_minutes)}`
    : motivo;
}
