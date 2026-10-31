import Link from "next/link";
import { listarMetasPendientesHasta } from "@/lib/data/metas";
import { fechaCorta, sumarDias } from "@/lib/planner/fechas";
import { NOMBRE_TIPO, textoFalta } from "@/lib/planner/metas";

// Sección de Hoy con las entregas, exámenes y metas de los próximos 14 días
// (y las que ya han pasado sin marcar). Si no hay ninguna, no se muestra.
export async function MetasProximas({ hoy }: { hoy: string }) {
  let metas: Awaited<ReturnType<typeof listarMetasPendientesHasta>>;
  try {
    metas = await listarMetasPendientesHasta(sumarDias(hoy, 14));
  } catch {
    // La tabla aún no existe (falta la migración): Hoy sigue funcionando.
    return null;
  }
  if (metas.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Se acercan</h2>
      <ul className="flex flex-col gap-2">
        {metas.map((m) => {
          const pasada = m.due_date !== null && m.due_date < hoy;
          return (
            <li key={m.id}>
              <Link
                href={`/areas/${m.projects.area_id}/proyectos/${m.project_id}#meta-${m.id}`}
                className="card flex items-baseline gap-3 p-4"
              >
                <span
                  className={`w-24 shrink-0 text-sm ${pasada ? "text-danger" : "text-muted"}`}
                >
                  {m.due_date ? textoFalta(m.due_date, hoy) : ""}
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="break-words">{m.title}</span>
                  <span className="text-sm text-muted">
                    {NOMBRE_TIPO[m.kind]} · {m.projects.name}
                    {m.due_date && ` · ${fechaCorta(m.due_date)}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
