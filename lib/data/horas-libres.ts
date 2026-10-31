import "server-only";
import {
  HORAS_SUENO_INICIALES,
  type HorasSueno,
} from "@/lib/planner/horas-libres";
import { createClient } from "@/lib/supabase/server";

// Las horas de sueño que usa la barra de Áreas.
// Las reglas están en lib/planner/horas-libres.ts.

export async function leerHorasSueno(): Promise<HorasSueno> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("sleep_hours")
    .maybeSingle();
  // Si la migración aún no está puesta o no hay fila, se usan 9 h.
  if (error || !data || data.sleep_hours === null) return HORAS_SUENO_INICIALES;
  return { sueno: Number(data.sleep_hours) };
}

// Crea la fila de ajustes si aún no existe.
export async function guardarHorasSueno(horas: HorasSueno) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: userId, sleep_hours: horas.sueno },
      { onConflict: "user_id" },
    );
  if (error)
    throw new Error(`No se han podido guardar las horas: ${error.message}`);
}
