import "server-only";
import { esCuentaDemo } from "@/lib/data/demo";
import { topeUsosIA } from "@/lib/planner/demo";
import { createClient } from "@/lib/supabase/server";

// Contador de usos de la IA por persona y día (tabla ai_usage).
// Sirve para que nadie agote el plan gratuito de Groq, que es compartido.
// El tope es 20 al día, y 5 en las cuentas de demostración.

// Cuántos usos tienes al día (para los mensajes de «ya has llegado al tope»).
export async function topeIA(): Promise<number> {
  return topeUsosIA(await esCuentaDemo());
}

// Apunta un uso si aún queda. Devuelve false si ya has llegado al tope de hoy.
export async function apuntarUsoIA(hoy: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const userId = sesion?.claims?.sub;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("ai_usage")
    .select("calls")
    .eq("on_date", hoy)
    .maybeSingle();
  if (error)
    throw new Error(`No se ha podido leer el uso de la IA: ${error.message}`);
  const usos = (data?.calls as number | undefined) ?? 0;
  if (usos >= (await topeIA())) return false;

  const { error: errorGuardar } = await supabase
    .from("ai_usage")
    .upsert(
      { user_id: userId, on_date: hoy, calls: usos + 1 },
      { onConflict: "user_id,on_date" },
    );
  if (errorGuardar)
    throw new Error(
      `No se ha podido apuntar el uso de la IA: ${errorGuardar.message}`,
    );
  return true;
}
