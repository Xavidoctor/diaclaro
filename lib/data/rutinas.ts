import "server-only";
import { createClient } from "@/lib/supabase/server";
import { horaCorta } from "@/lib/planner/agenda";
import type {
  DatosRutina,
  RegistroRutina,
  Rutina,
} from "@/lib/planner/rutinas";

// Única parte de las Rutinas que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

const CAMPOS_RUTINA =
  "id, title, notes, repeat_rule, times_per_day, duration_minutes, window_start, window_end, times_of_day, part_of_day, focus, focus_alarm_minutes, active, project_id, url";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

function limpiar(r: Rutina): Rutina {
  return {
    ...r,
    window_start: horaCorta(r.window_start),
    window_end: horaCorta(r.window_end),
    times_of_day: r.times_of_day?.map(horaCorta) ?? null,
  };
}

export async function listarRutinas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select(CAMPOS_RUTINA)
    .order("created_at")
    .limit(200);
  comprobar(error, "cargar las rutinas");
  return ((data ?? []) as Rutina[]).map(limpiar);
}

export async function leerRutina(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select(CAMPOS_RUTINA)
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer la rutina");
  return data ? limpiar(data as Rutina) : null;
}

export async function crearRutina(
  datos: DatosRutina & { project_id?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert(datos);
  comprobar(error, "guardar la rutina");
}

export async function cambiarRutina(
  id: string,
  cambios: Partial<
    DatosRutina & { active: boolean; project_id: string | null }
  >,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update(cambios)
    .eq("id", id);
  comprobar(error, "cambiar la rutina");
}

// Las rutinas de un proyecto (también las pausadas).
export async function listarRutinasDeProyecto(proyectoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select(CAMPOS_RUTINA)
    .eq("project_id", proyectoId)
    .order("created_at")
    .limit(200);
  comprobar(error, "cargar las rutinas del proyecto");
  return ((data ?? []) as Rutina[]).map(limpiar);
}

// Borra la rutina y todo su registro (la base de datos lo hace sola).
export async function borrarRutina(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", id);
  comprobar(error, "borrar la rutina");
}

export async function listarRegistrosDelDia(fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_logs")
    .select("routine_id, on_date, slot")
    .eq("on_date", fecha)
    .limit(500);
  comprobar(error, "cargar las rutinas hechas");
  return (data ?? []) as RegistroRutina[];
}

// "vez" = qué vez del día (1, 2...). Sin vez, cuenta como la primera que quedaba.
export async function apuntarHecha(
  rutinaId: string,
  fecha: string,
  vez: number | null = null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_logs")
    .insert({ routine_id: rutinaId, on_date: fecha, slot: vez });
  comprobar(error, "apuntar la rutina");
}

// Deshace una vez apuntada ese día (por si pulsas «Hecho» sin querer).
// Con "vez", quita esa vez; si se apuntó sin vez, o no dices cuál,
// quita la última apuntada sin vez (o la última, si no hay ninguna así).
export async function quitarHecha(
  rutinaId: string,
  fecha: string,
  vez: number | null = null,
) {
  const supabase = await createClient();
  const base = () =>
    supabase
      .from("routine_logs")
      .select("id")
      .eq("routine_id", rutinaId)
      .eq("on_date", fecha)
      .order("created_at", { ascending: false })
      .limit(1);
  const conVez = vez ? await base().eq("slot", vez).maybeSingle() : null;
  comprobar(conVez?.error ?? null, "buscar esa vez");
  let borrar = conVez?.data ?? null;
  if (!borrar) {
    const sinVez = await base().is("slot", null).maybeSingle();
    comprobar(sinVez.error, "buscar la última vez");
    borrar = sinVez.data;
  }
  if (!borrar && !vez) {
    const ultima = await base().maybeSingle();
    comprobar(ultima.error, "buscar la última vez");
    borrar = ultima.data;
  }
  if (!borrar) return;
  const { error: errorBorrar } = await supabase
    .from("routine_logs")
    .delete()
    .eq("id", borrar.id);
  comprobar(errorBorrar, "deshacer");
}
