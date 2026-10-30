import "server-only";
import { createClient } from "@/lib/supabase/server";
import { horaCorta } from "@/lib/planner/agenda";
import { AJUSTES_INICIALES, type Ajustes } from "@/lib/planner/ajustes";

// Única parte de los Ajustes que habla con Supabase.
// Hay una sola fila por persona; si aún no existe, se usan los ajustes iniciales.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerAjustes(): Promise<Ajustes> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("timezone, wake_time, sleep_time, lunch_time, dinner_time")
    .maybeSingle();
  comprobar(error, "leer los ajustes");
  if (!data) return AJUSTES_INICIALES;
  const a = data as Ajustes;
  return {
    timezone: a.timezone,
    wake_time: horaCorta(a.wake_time),
    sleep_time: horaCorta(a.sleep_time),
    lunch_time: horaCorta(a.lunch_time),
    dinner_time: horaCorta(a.dinner_time),
  };
}

// Crea la fila la primera vez y la cambia las siguientes.
export async function guardarAjustes(ajustes: Ajustes) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: userId, ...ajustes }, { onConflict: "user_id" });
  comprobar(error, "guardar los ajustes");
}
