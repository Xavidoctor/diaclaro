import Link from "next/link";
import { CasillaHecha } from "@/app/bandeja/casilla-hecha";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas } from "@/lib/data/bandeja";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { textoDuracion } from "@/lib/planner/carga";
import {
  marcarTiempoPersonal,
  motivoOrden,
  planDelDia,
  type TareaParaPlan,
} from "@/lib/planner/plan";

// Tarjeta de Hoy con tu plan: la siguiente tarea, tus 3 prioridades y el resto
// en orden. El orden se calcula en lib/planner/plan.ts (sin IA).
export async function PlanDeHoy({ hoy }: { hoy: string }) {
  const [tareas, { areas, proyectos }] = await Promise.all([
    listarTareas(false),
    cargarOpcionesProyecto(),
  ]);
  const { atrasadas, deHoy } = tareasParaHoy(tareas, hoy);
  const plan = planDelDia(
    marcarTiempoPersonal([...atrasadas, ...deHoy], areas, proyectos),
    hoy,
  );

  if (!plan.siguiente) {
    return (
      <section className="card flex flex-col gap-1 p-4 text-sm">
        <h2 className="text-lg font-semibold">Tu plan de hoy</h2>
        <p className="text-muted">
          No tienes tareas para hoy. Ponle la fecha de hoy a alguna en la{" "}
          <Link href="/bandeja?pestana=tareas" className="enlace">
            Tareas
          </Link>{" "}
          y aquí verás por cuál empezar.
        </p>
      </section>
    );
  }

  const { siguiente, prioridades, resto } = plan;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Tu plan de hoy</h2>
        <Link href="/dia-dificil" className="enlace text-sm">
          Día difícil
        </Link>
      </header>

      <div className="card flex flex-col gap-3 border-primary p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Siguiente tarea
        </p>
        <p className="text-xl font-semibold break-words">{siguiente.title}</p>
        <p className="text-sm text-muted">{detalle(siguiente, hoy)}</p>
        <Link
          href={`/foco?tarea=${siguiente.id}`}
          className="button-primary self-start py-2 text-sm"
        >
          Concentrarme
        </Link>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Tus 3 prioridades
      </h3>
      <ol className="flex flex-col gap-2">
        {prioridades.map((t, i) => (
          <Fila key={t.id} tarea={t} numero={i + 1} hoy={hoy} />
        ))}
      </ol>

      {resto.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer text-sm text-muted">
            Después, en este orden ({resto.length})
          </summary>
          <ol className="mt-2 flex flex-col gap-2">
            {resto.map((t, i) => (
              <Fila
                key={t.id}
                tarea={t}
                numero={prioridades.length + i + 1}
                hoy={hoy}
              />
            ))}
          </ol>
        </details>
      )}
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

function Fila({
  tarea,
  numero,
  hoy,
}: {
  tarea: TareaParaPlan;
  numero: number;
  hoy: string;
}) {
  return (
    <li className="card flex items-start gap-3 p-3">
      <CasillaHecha
        id={tarea.id}
        titulo={tarea.title}
        previstos={tarea.estimated_minutes}
      />
      <div className="flex flex-1 flex-col">
        <span className="break-words">
          {numero}. {tarea.title}
        </span>
        <span className="text-sm text-muted">{detalle(tarea, hoy)}</span>
      </div>
    </li>
  );
}
