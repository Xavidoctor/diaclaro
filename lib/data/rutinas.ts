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
  "id, title, notes, repeat_rule, times_per_day, duration_minutes, window_start, window_end, part_of_day, active";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

function limpiar(r: Rutina): Rutina {
  return {
    ...r,
    window_start: horaCorta(r.window_start),
    window_end: horaCorta(r.window_end),
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

export async function crearRutina(datos: DatosRutina) {
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert(datos);
  comprobar(error, "guardar la rutina");
}

export async function cambiarRutina(
  id: string,
  cambios: Partial<DatosRutina & { active: boolean }>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update(cambios)
    .eq("id", id);
  comprobar(error, "cambiar la rutina");
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
    .select("routine_id, on_date")
    .eq("on_date", fecha)
    .limit(500);
  comprobar(error, "cargar las rutinas hechas");
  return (data ?? []) as RegistroRutina[];
}

export async function apuntarHecha(rutinaId: string, fecha: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_logs")
    .insert({ routine_id: rutinaId, on_date: fecha });
  comprobar(error, "apuntar la rutina");
}

// Deshace la última vez apuntada ese día (por si pulsas «Hecho» sin querer).
export async function quitarUltimaHecha(rutinaId: string, fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_logs")
    .select("id")
    .eq("routine_id", rutinaId)
    .eq("on_date", fecha)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  comprobar(error, "buscar la última vez");
  if (!data) return;
  const { error: errorBorrar } = await supabase
    .from("routine_logs")
    .delete()
    .eq("id", data.id);
  comprobar(errorBorrar, "deshacer");
}
