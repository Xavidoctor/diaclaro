import "server-only";
import type { DiaDificil } from "@/lib/planner/dia-dificil";
import { createClient } from "@/lib/supabase/server";

// Única parte del Día difícil que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerDiaDificil(fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hard_days")
    .select("on_date, reason, kept_task_ids")
    .eq("on_date", fecha)
    .maybeSingle();
  comprobar(error, "leer el día difícil");
  return (data as DiaDificil | null) ?? null;
}

// Apunta que ese día fue difícil. Si ya estaba apuntado, se cambia.
export async function guardarDiaDificil(dia: DiaDificil) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("hard_days")
    .upsert({ user_id: userId, ...dia }, { onConflict: "user_id,on_date" });
  comprobar(error, "guardar el día difícil");
}

// Título y estado de unas tareas concretas (las conservadas).
export async function listarTareasPorIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, done_at")
    .in("id", ids)
    .is("deleted_at", null);
  comprobar(error, "cargar las tareas conservadas");
  return (data ?? []) as {
    id: string;
    title: string;
    done_at: string | null;
  }[];
}
