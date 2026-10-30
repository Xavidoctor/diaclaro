import "server-only";
import { listarAreas } from "@/lib/data/areas";
import { minutosDeCandidaturasPorArea } from "@/lib/data/candidaturas";
import { minutosDeFocoPorTarea } from "@/lib/data/foco";
import { sumarDias } from "@/lib/planner/fechas";
import {
  calcularResumen,
  type ProyectoDeArea,
  type SesionSemana,
  type TareaHecha,
} from "@/lib/planner/resumen-semana";
import { createClient } from "@/lib/supabase/server";

// Única parte del resumen semanal que habla con Supabase: junta los datos
// y deja las cuentas a lib/planner/resumen-semana.ts.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// El resumen de la semana que empieza el lunes `desde`.
export async function cargarResumenSemana(desde: string, zona: string) {
  const hasta = sumarDias(desde, 6);
  const [areas, proyectos, sesiones, tareas, candidaturas] = await Promise.all(
    [
      listarAreas(),
      listarProyectosConArea(),
      sesionesDeLaSemana(desde, hasta),
      tareasHechasCerca(desde, hasta),
      // Si las candidaturas aún no tienen área (falta su migración), cuentan 0.
      minutosDeCandidaturasPorArea(desde, hasta).catch(
        () => new Map<string, number>(),
      ),
    ],
  );
  const focoTotalPorTarea = await minutosDeFocoPorTarea(
    tareas.map((t) => t.id),
  );
  return calcularResumen({
    areas,
    proyectos,
    sesiones,
    tareas,
    focoTotalPorTarea,
    candidaturas,
    desde,
    hasta,
    zona,
  });
}

async function listarProyectosConArea() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, area_id")
    .limit(1000);
  comprobar(error, "cargar los proyectos");
  return (data ?? []) as ProyectoDeArea[];
}

async function sesionesDeLaSemana(
  desde: string,
  hasta: string,
): Promise<SesionSemana[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("task_id, minutes, tasks(project_id)")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(2000);
  comprobar(error, "cargar las sesiones de foco");
  const filas = (data ?? []) as unknown as {
    task_id: string | null;
    minutes: number;
    tasks: { project_id: string | null } | null;
  }[];
  return filas.map((s) => ({
    task_id: s.task_id,
    project_id: s.tasks?.project_id ?? null,
    minutes: s.minutes,
  }));
}

// Tareas terminadas con el tiempo apuntado. Pedimos un día de margen por
// cada lado (por las zonas horarias); el planner se queda solo con la semana.
async function tareasHechasCerca(
  desde: string,
  hasta: string,
): Promise<TareaHecha[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, project_id, done_at, actual_minutes")
    .not("actual_minutes", "is", null)
    .gte("done_at", sumarDias(desde, -1))
    .lt("done_at", sumarDias(hasta, 2))
    .limit(2000);
  comprobar(error, "cargar las tareas hechas");
  return (data ?? []) as TareaHecha[];
}
