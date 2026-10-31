import "server-only";
import { leerAjustes } from "@/lib/data/ajustes";
import { createClient } from "@/lib/supabase/server";

// ¿Usa la app lo que sueles tardar de verdad? (Ajuste de «Así te conozco».)
// Va aparte de leerAjustes a propósito: si aún no está la columna
// (migración 20261030470000), la app sigue funcionando y lo usa, como antes.

export async function leerUsarRitmo(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("use_real_pace")
    .maybeSingle();
  if (error || !data) return true;
  return (data as { use_real_pace: boolean | null }).use_real_pace !== false;
}

// Crea la fila de ajustes la primera vez (con los iniciales) y la cambia las
// siguientes.
export async function guardarUsarRitmo(usar: boolean) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const ajustes = await leerAjustes();
  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: userId, ...ajustes, use_real_pace: usar },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`No se ha podido guardar: ${error.message}`);
}
