import "server-only";
import type { Cierre } from "@/lib/planner/cierre";
import { createClient } from "@/lib/supabase/server";

// Única parte del cierre del día que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerCierre(fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("day_reviews")
    .select("on_date, achieved, change_tomorrow")
    .eq("on_date", fecha)
    .maybeSingle();
  comprobar(error, "leer el cierre del día");
  return (data as Cierre | null) ?? null;
}

// Crea el cierre del día la primera vez y lo cambia las siguientes.
export async function guardarCierre(cierre: Cierre) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("day_reviews")
    .upsert({ user_id: userId, ...cierre }, { onConflict: "user_id,on_date" });
  comprobar(error, "guardar el cierre del día");
}

// Tareas marcadas como hechas desde un momento dado (para el resumen del día).
export async function listarTareasHechasDesde(desde: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, done_at")
    .is("deleted_at", null)
    .gte("done_at", desde.toISOString())
    .order("done_at")
    .limit(300);
  comprobar(error, "cargar las tareas hechas");
  return (data ?? []) as { id: string; title: string; done_at: string }[];
}
