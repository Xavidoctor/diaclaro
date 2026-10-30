import "server-only";
import type { TipoNota } from "@/lib/planner/etiquetas";
import { createClient } from "@/lib/supabase/server";

// Única parte de la Bandeja que habla con Supabase.
// No hace falta filtrar por user_id: las reglas RLS de la base de datos ya
// hacen que cada persona solo vea y cambie sus propias filas.

export type Nota = {
  id: string;
  body: string;
  url: string | null;
  kind: TipoNota;
  tags: string[];
  pinned: boolean;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  // Tareas creadas a partir de esta nota.
  tasks: { id: string; title: string; done_at: string | null }[];
};

export type Tarea = {
  id: string;
  title: string;
  details: string | null;
  due_date: string | null;
  kind: "tarea" | "entrega";
  estimated_minutes: number | null;
  actual_minutes: number | null;
  note_id: string | null;
  project_id: string | null;
  done_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type VistaNotas = "activas" | "archivo" | "papelera";

const CAMPOS_NOTA =
  "id, body, url, kind, tags, pinned, archived_at, deleted_at, created_at, tasks(id, title, done_at)";
const CAMPOS_TAREA =
  "id, title, details, kind, due_date, estimated_minutes, actual_minutes, note_id, project_id, done_at, deleted_at, created_at";

// Lanza un error con un mensaje claro si Supabase falla.
function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export type FiltrosNotas = {
  busqueda: string;
  etiqueta: string | null;
  tipo: TipoNota | null;
};

export async function listarNotas(vista: VistaNotas, filtros: FiltrosNotas) {
  const { busqueda, etiqueta, tipo } = filtros;
  const supabase = await createClient();
  let consulta = supabase.from("notes").select(CAMPOS_NOTA);

  if (vista === "papelera") consulta = consulta.not("deleted_at", "is", null);
  else {
    consulta = consulta.is("deleted_at", null);
    consulta =
      vista === "archivo"
        ? consulta.not("archived_at", "is", null)
        : consulta.is("archived_at", null);
  }
  if (etiqueta) consulta = consulta.contains("tags", [etiqueta]);
  if (tipo) consulta = consulta.eq("kind", tipo);
  if (busqueda) {
    // Búsqueda de texto de Postgres en español (columna "search").
    consulta = consulta.textSearch("search", busqueda, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data, error } = await consulta
    .order("created_at", { ascending: false })
    .limit(200);
  comprobar(error, "cargar las notas");
  return (data ?? []) as Nota[];
}

export async function listarTareas(papelera: boolean) {
  const supabase = await createClient();
  let consulta = supabase.from("tasks").select(CAMPOS_TAREA);
  consulta = papelera
    ? consulta.not("deleted_at", "is", null)
    : consulta.is("deleted_at", null);
  const { data, error } = await consulta
    .order("created_at", { ascending: false })
    .limit(300);
  comprobar(error, "cargar las tareas");
  return (data ?? []) as Tarea[];
}

// Las tareas de un proyecto (sin las de la papelera).
export async function listarTareasDeProyecto(proyectoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(CAMPOS_TAREA)
    .eq("project_id", proyectoId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(300);
  comprobar(error, "cargar las tareas del proyecto");
  return (data ?? []) as Tarea[];
}

// Etiquetas de todas las notas que no están en la papelera (para los filtros).
export async function listarEtiquetasUsadas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("tags")
    .is("deleted_at", null)
    .neq("tags", "{}");
  comprobar(error, "cargar las etiquetas");
  return (data ?? []) as { tags: string[] }[];
}

export async function crearNota(datos: {
  body: string;
  url: string | null;
  kind: TipoNota;
  tags: string[];
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert(datos);
  comprobar(error, "guardar la nota");
}

export async function crearTarea(datos: {
  title: string;
  details?: string | null;
  note_id?: string | null;
  project_id?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(datos);
  comprobar(error, "guardar la tarea");
}

export async function cambiarNota(
  id: string,
  cambios: Partial<{
    body: string;
    url: string | null;
    kind: TipoNota;
    tags: string[];
    pinned: boolean;
    archived_at: string | null;
    deleted_at: string | null;
  }>,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update(cambios).eq("id", id);
  comprobar(error, "cambiar la nota");
}

export async function cambiarTarea(
  id: string,
  cambios: Partial<{
    title: string;
    due_date: string | null;
    estimated_minutes: number | null;
    actual_minutes: number | null;
    project_id: string | null;
    done_at: string | null;
    deleted_at: string | null;
  }>,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(cambios).eq("id", id);
  comprobar(error, "cambiar la tarea");
}

export async function leerNota(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, body")
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer la nota");
  return data as { id: string; body: string } | null;
}

// Borrar para siempre: solo se permite desde la papelera.
export async function borrarNotaDefinitiva(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null);
  comprobar(error, "borrar la nota");
}

export async function borrarTareaDefinitiva(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null);
  comprobar(error, "borrar la tarea");
}
