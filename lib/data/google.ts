import "server-only";
import { createClient } from "@/lib/supabase/server";

// Única parte de la conexión con Google que habla con Supabase.
// Solo guarda el permiso cifrado y el correo: los eventos no se copian.
// Las reglas RLS hacen que cada persona solo vea su propia conexión.

export type ConexionGoogle = {
  google_email: string | null;
  refresh_token_cifrado: string;
};

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerConexionGoogle(): Promise<ConexionGoogle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_connections")
    .select("google_email, refresh_token_cifrado")
    .maybeSingle();
  comprobar(error, "leer tu conexión con Google");
  return (data as ConexionGoogle | null) ?? null;
}

// Si ya estabas conectado, se sustituye (por ejemplo, con otra cuenta).
export async function guardarConexionGoogle(conexion: ConexionGoogle) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("google_connections")
    .upsert(conexion, { onConflict: "user_id" });
  comprobar(error, "guardar tu conexión con Google");
}

export async function borrarConexionGoogle() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  const { error } = await supabase
    .from("google_connections")
    .delete()
    .eq("user_id", userId);
  comprobar(error, "borrar tu conexión con Google");
}
