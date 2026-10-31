import "server-only";
import {
  HORAS_DESCANSO_INICIALES,
  type HorasDescanso,
} from "@/lib/planner/horas-libres";
import { createClient } from "@/lib/supabase/server";

// Las horas de sueño y descansos que usa la barra de Áreas.
// Las reglas están en lib/planner/horas-libres.ts.

export async function leerHorasDescanso(): Promise<HorasDescanso> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("sleep_hours, rest_hours")
    .maybeSingle();
  // Si la migración aún no está puesta o no hay fila, se usan 9 y 4.
  if (error || !data) return HORAS_DESCANSO_INICIALES;
  return {
    sueno:
      data.sleep_hours === null
        ? HORAS_DESCANSO_INICIALES.sueno
        : Number(data.sleep_hours),
    descanso:
      data.rest_hours === null
        ? HORAS_DESCANSO_INICIALES.descanso
        : Number(data.rest_hours),
  };
}

// Crea la fila de ajustes si aún no existe.
export async function guardarHorasDescanso(horas: HorasDescanso) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: userId, sleep_hours: horas.sueno, rest_hours: horas.descanso },
      { onConflict: "user_id" },
    );
  if (error)
    throw new Error(`No se han podido guardar las horas: ${error.message}`);
}
