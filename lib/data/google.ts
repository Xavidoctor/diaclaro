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

// ---- Tareas que salieron de un evento de Google ----

// Crea la tarea y devuelve su id. Si ya la habías creado desde ese mismo
// evento (y día), no la repite: devuelve la que ya tenías.
export async function crearTareaDesdeGoogle(tarea: {
  title: string;
  due_date: string;
  estimated_minutes: number | null;
  google_event: string;
}): Promise<string> {
  const supabase = await createClient();
  const { data: ya, error: errorBuscar } = await supabase
    .from("tasks")
    .select("id")
    .eq("google_event", tarea.google_event)
    .is("deleted_at", null)
    .maybeSingle();
  comprobar(errorBuscar, "buscar la tarea");
  if (ya) return (ya as { id: string }).id;
  const { data, error } = await supabase
    .from("tasks")
    .insert(tarea)
    .select("id")
    .single();
  comprobar(error, "guardar la tarea");
  return (data as { id: string }).id;
}

// Las tareas que creaste desde eventos de Google entre dos días
// (sin las de la papelera): para cada evento, el id de su tarea.
export async function tareasDesdeGoogle(
  desde: string,
  hasta: string,
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, google_event")
    .not("google_event", "is", null)
    .is("deleted_at", null)
    .gte("due_date", desde)
    .lte("due_date", hasta)
    .limit(500);
  comprobar(error, "buscar tus tareas de Google");
  return new Map(
    ((data ?? []) as { id: string; google_event: string }[]).map((t) => [
      t.google_event,
      t.id,
    ]),
  );
}
