import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ordenarMetas, type DatosMeta, type Meta } from "@/lib/planner/metas";

// Única parte de las metas de los proyectos que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

const CAMPOS_META = "id, project_id, title, kind, due_date, remind_at, done_at";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function listarMetasDeProyecto(proyectoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_goals")
    .select(CAMPOS_META)
    .eq("project_id", proyectoId)
    .limit(200);
  comprobar(error, "cargar las metas");
  return ordenarMetas((data ?? []) as Meta[]);
}

export type MetaConProyecto = Meta & {
  projects: { name: string; area_id: string };
};

// Las metas pendientes con fecha hasta "hasta" (también las ya pasadas),
// con el nombre de su proyecto, para Hoy. Las de proyectos archivados no salen.
export async function listarMetasPendientesHasta(hasta: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_goals")
    .select(`${CAMPOS_META}, projects!inner(name, area_id)`)
    .is("done_at", null)
    .is("projects.archived_at", null)
    .not("due_date", "is", null)
    .lte("due_date", hasta)
    .order("due_date")
    .limit(50);
  comprobar(error, "cargar las metas");
  return (data ?? []) as unknown as MetaConProyecto[];
}

export async function crearMeta(proyectoId: string, datos: DatosMeta) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_goals")
    .insert({ ...datos, project_id: proyectoId });
  comprobar(error, "guardar la meta");
}

// Si cambias la hora del aviso, se vuelve a avisar a la hora nueva.
export async function cambiarMeta(id: string, datos: DatosMeta) {
  const supabase = await createClient();
  const { data: antes, error: errorLeer } = await supabase
    .from("project_goals")
    .select("remind_at")
    .eq("id", id)
    .maybeSingle();
  comprobar(errorLeer, "leer la meta");
  const cambios =
    antes?.remind_at === datos.remind_at
      ? datos
      : { ...datos, reminder_sent_at: null };
  const { error } = await supabase
    .from("project_goals")
    .update(cambios)
    .eq("id", id);
  comprobar(error, "cambiar la meta");
}

export async function marcarMeta(id: string, hecha: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_goals")
    .update({ done_at: hecha ? new Date().toISOString() : null })
    .eq("id", id);
  comprobar(error, "marcar la meta");
}

export async function borrarMeta(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_goals").delete().eq("id", id);
  comprobar(error, "borrar la meta");
}
