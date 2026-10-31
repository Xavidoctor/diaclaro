"use server";

import { aplicarCambio } from "@/lib/data/cambios-sin-conexion";
import { esquemaCambio, type Resultado } from "@/lib/planner/cambios-sin-conexion";
import { createClient } from "@/lib/supabase/server";

// Envía un cambio que hiciste sin internet. «forzar» = has elegido
// «Guardar el mío» en «Revisa este cambio».
export async function enviarCambio(
  cambio: unknown,
  forzar = false,
): Promise<Resultado> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { estado: "error" };
  const r = esquemaCambio.safeParse(cambio);
  // Si está roto no hay forma de arreglarlo: se da por enviado y se quita.
  if (!r.success) return { estado: "ok" };
  try {
    return await aplicarCambio(r.data, forzar);
  } catch {
    return { estado: "error" };
  }
}
