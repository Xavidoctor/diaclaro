import "server-only";
import { horaCorta } from "@/lib/planner/agenda";
import type { InicioDia } from "@/lib/planner/inicio-dia";
import { createClient } from "@/lib/supabase/server";

// Única parte de "Empiezo el día" que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerInicio(fecha: string): Promise<InicioDia | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("day_starts")
    .select("on_date, awake_time, start_time, sleep_time")
    .eq("on_date", fecha)
    .maybeSingle();
  comprobar(error, "leer el inicio del día");
  if (!data) return null;
  const d = data as InicioDia;
  // La base de datos devuelve "10:12:00": nos quedamos con "10:12".
  return {
    on_date: d.on_date,
    awake_time: horaCorta(d.awake_time),
    start_time: horaCorta(d.start_time),
    sleep_time: horaCorta(d.sleep_time),
  };
}

// Guarda el inicio del día. Si ya existía (por ejemplo, pulsaste "Despierto"
// y ahora "Levantado"), solo se cambian los datos que mandas; los demás se quedan.
export async function guardarInicio(
  inicio: Pick<InicioDia, "on_date"> & Partial<InicioDia>,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("day_starts")
    .upsert({ user_id: userId, ...inicio }, { onConflict: "user_id,on_date" });
  comprobar(error, "guardar el inicio del día");
}

// "Deshacer": borra el inicio de un día.
export async function borrarInicio(fecha: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("day_starts")
    .delete()
    .eq("on_date", fecha);
  comprobar(error, "deshacer el inicio del día");
}
