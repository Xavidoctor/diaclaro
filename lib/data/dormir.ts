import "server-only";
import { horaCorta } from "@/lib/planner/agenda";
import type { HoraDormir } from "@/lib/planner/dormir";
import { createClient } from "@/lib/supabase/server";

// Única parte de "Me voy a dormir" que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// Las horas de acostarte entre dos noches (las dos incluidas).
export async function listarHorasDormir(
  desde: string,
  hasta: string,
): Promise<HoraDormir[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bedtimes")
    .select("on_date, bed_time")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(400);
  comprobar(error, "cargar tus horas de dormir");
  // La base de datos devuelve "23:40:00": nos quedamos con "23:40".
  return ((data ?? []) as HoraDormir[]).map((h) => ({
    on_date: h.on_date,
    bed_time: horaCorta(h.bed_time) ?? h.bed_time,
  }));
}

// Guarda (o cambia) la hora de acostarte de una noche.
export async function guardarHoraDormir(hora: HoraDormir) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("bedtimes")
    .upsert({ user_id: userId, ...hora }, { onConflict: "user_id,on_date" });
  comprobar(error, "guardar tu hora de dormir");
}

export async function borrarHoraDormir(noche: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bedtimes")
    .delete()
    .eq("on_date", noche);
  comprobar(error, "borrar tu hora de dormir");
}
