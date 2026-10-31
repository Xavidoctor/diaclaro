import "server-only";
import { horaCorta } from "@/lib/planner/agenda";
import type { MovidaRutina } from "@/lib/planner/mover-dia";
import { createClient } from "@/lib/supabase/server";

// Única parte de «ordenar el día» que habla con Supabase: qué rutinas
// tienen hora fija y las horas que has movido solo un día.
// Las reglas RLS ya hacen que cada persona solo vea y cambie lo suyo.
// Necesita la migración 20261030510000_mover_en_el_dia.sql.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// Las rutinas en las que has dicho si son fijas o no (id → fija).
// Las que no salen aquí deciden solas (ver rutinaFija en mover-dia.ts).
export async function leerRutinasFijas(): Promise<Map<string, boolean>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, fixed_time")
    .not("fixed_time", "is", null)
    .limit(200);
  comprobar(error, "leer las horas fijas");
  return new Map(
    (data ?? []).map((r) => [r.id as string, Boolean(r.fixed_time)]),
  );
}

export async function cambiarRutinaFija(id: string, fija: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ fixed_time: fija })
    .eq("id", id);
  comprobar(error, "cambiar la hora fija");
}

// Las horas que has movido entre dos días (los dos incluidos).
export async function listarMovidas(
  desde: string,
  hasta: string,
): Promise<MovidaRutina[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_moves")
    .select("routine_id, on_date, slot, start_time")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(500);
  comprobar(error, "leer las horas movidas");
  return ((data ?? []) as MovidaRutina[]).map((m) => ({
    ...m,
    start_time: horaCorta(m.start_time)!,
  }));
}

// Mueve una vez de una rutina solo ese día (si ya la habías movido, la cambia).
export async function guardarMovida(m: MovidaRutina) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_moves")
    .upsert(m, { onConflict: "routine_id,on_date,slot" });
  comprobar(error, "mover la rutina");
}

// Vuelve a su hora de siempre ese día.
export async function quitarMovida(
  rutinaId: string,
  fecha: string,
  vez: number,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_moves")
    .delete()
    .eq("routine_id", rutinaId)
    .eq("on_date", fecha)
    .eq("slot", vez);
  comprobar(error, "devolver la rutina a su hora");
}
