import "server-only";
import { createClient } from "@/lib/supabase/server";

// Única parte de la conexión con Google que habla con Supabase.
// Solo guarda el permiso cifrado y el correo: los eventos no se copian.
// Las reglas RLS hacen que cada persona solo vea su propia conexión.

export type ConexionGoogle = {
  google_email: string | null;
  refresh_token_cifrado: string;
  drive?: boolean; // si también diste el permiso de Drive
};

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function leerConexionGoogle(): Promise<ConexionGoogle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_connections")
    // "*" para que siga funcionando aunque aún falte alguna columna nueva.
    .select("*")
    .maybeSingle();
  comprobar(error, "leer tu conexión con Google");
  return (data as ConexionGoogle | null) ?? null;
}

// Si ya estabas conectado, se sustituye (por ejemplo, con otra cuenta).
export async function guardarConexionGoogle(conexion: ConexionGoogle) {
  const supabase = await createClient();
  // "drive" solo se manda cuando es sí: Google mantiene los permisos que ya
  // diste, y así no hace falta la columna nueva si nunca conectas Drive.
  const { drive, ...resto } = conexion;
  const fila: Record<string, unknown> = drive ? { ...resto, drive } : resto;
  const { error } = await supabase
    .from("google_connections")
    .upsert(fila, { onConflict: "user_id" });
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

// ---- Documentos de Drive enlazados a un proyecto ----

export type DocumentoDrive = {
  id: string;
  drive_file_id: string;
  title: string;
  url: string;
  mime_type: string | null;
};

export async function listarDocumentos(
  proyectoId: string,
): Promise<DocumentoDrive[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("id, drive_file_id, title, url, mime_type")
    .eq("project_id", proyectoId)
    .order("created_at")
    .limit(200);
  comprobar(error, "cargar los documentos");
  return (data ?? []) as DocumentoDrive[];
}

// Si ya estaba enlazado, no lo repite.
export async function enlazarDocumentos(
  proyectoId: string,
  documentos: Omit<DocumentoDrive, "id">[],
) {
  if (documentos.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("project_documents").upsert(
    documentos.map((d) => ({ ...d, project_id: proyectoId })),
    { onConflict: "user_id,project_id,drive_file_id", ignoreDuplicates: true },
  );
  comprobar(error, "enlazar los documentos");
}

// Quita el enlace. El documento sigue en tu Drive.
export async function quitarDocumento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", id);
  comprobar(error, "quitar el documento");
}
