import "server-only";
import { minutosPorTarea, type DatosSesion } from "@/lib/planner/foco";
import { createClient } from "@/lib/supabase/server";

// Única parte del temporizador de foco que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

export type SesionFoco = {
  id: string;
  task_id: string | null;
  on_date: string;
  started_at: string;
  planned_minutes: number | null;
  minutes: number;
  tasks: { title: string } | null;
  routines: { title: string } | null;
};

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function listarSesionesDelDia(fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select(
      "id, task_id, on_date, started_at, planned_minutes, minutes, tasks(title), routines(title)",
    )
    .eq("on_date", fecha)
    .order("started_at")
    .limit(200);
  comprobar(error, "cargar las sesiones de foco");
  return (data ?? []) as unknown as SesionFoco[];
}

export async function guardarSesion(datos: DatosSesion & { on_date: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("focus_sessions").insert(datos);
  comprobar(error, "guardar la sesión de foco");
}

export async function borrarSesion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("focus_sessions").delete().eq("id", id);
  comprobar(error, "borrar la sesión de foco");
}

// Minutos medidos con el temporizador en cada tarea: { "id-tarea": 50 }.
// Pensado para rellenar «¿Cuánto has tardado?» al marcar una tarea como hecha.
export async function minutosDeFocoPorTarea(
  ids: string[],
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("task_id, minutes")
    .in("task_id", ids)
    .limit(5000);
  comprobar(error, "sumar el tiempo de foco");
  return minutosPorTarea(data ?? []);
}
