import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  AREAS_SUGERIDAS,
  moverEnLista,
  ordenarAreas,
  ordenarProyectos,
  type Area,
  type DatosArea,
  type DatosProyecto,
  type Proyecto,
} from "@/lib/planner/areas";

// Única parte de las Áreas y los Proyectos que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

const CAMPOS_AREA =
  "id, name, weekly_minutes, personal_time, position, archived_at, color";
// Sin la migración 550000 aún no hay color: se lee sin él.
const CAMPOS_AREA_ANTES =
  "id, name, weekly_minutes, personal_time, position, archived_at";
const CAMPOS_PROYECTO =
  "id, area_id, name, kind, label, notes, url, archived_at";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// ¿Falla porque aún no existe la columna del color (migración 550000)?
function faltaColor(error: { code?: string; message: string } | null) {
  return Boolean(
    error &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      error.message.includes("color")),
  );
}

// Quita el color de unos cambios (para guardar sin la migración 550000).
function sinColor<T extends { color?: unknown }>(datos: T): T {
  const copia = { ...datos };
  delete copia.color;
  return copia;
}

export async function listarAreas() {
  const supabase = await createClient();
  const pedir = (campos: string) =>
    supabase.from("areas").select(campos).limit(100);
  let { data, error } = await pedir(CAMPOS_AREA);
  if (faltaColor(error)) ({ data, error } = await pedir(CAMPOS_AREA_ANTES));
  comprobar(error, "cargar las áreas");
  return ordenarAreas((data ?? []) as unknown as Area[]);
}

export async function leerArea(id: string) {
  const supabase = await createClient();
  const pedir = (campos: string) =>
    supabase.from("areas").select(campos).eq("id", id).maybeSingle();
  let { data, error } = await pedir(CAMPOS_AREA);
  if (faltaColor(error)) ({ data, error } = await pedir(CAMPOS_AREA_ANTES));
  comprobar(error, "leer el área");
  return (data as unknown as Area | null) ?? null;
}

// La nueva área va al final de la lista.
export async function crearArea(datos: DatosArea) {
  const supabase = await createClient();
  const areas = await listarAreas();
  const position = Math.max(-1, ...areas.map((a) => a.position)) + 1;
  const guardar = (fila: DatosArea & { position: number }) =>
    supabase.from("areas").insert(fila);
  let { error } = await guardar({ ...datos, position });
  // Sin la migración 550000: se guarda sin color.
  if (faltaColor(error))
    ({ error } = await guardar(sinColor({ ...datos, position })));
  comprobar(error, "guardar el área");
}

// Crea las áreas sugeridas, sin horas (solo si aún no tienes ninguna).
export async function crearAreasSugeridas() {
  const supabase = await createClient();
  const areas = await listarAreas();
  if (areas.length > 0) return;
  const { error } = await supabase
    .from("areas")
    .insert(AREAS_SUGERIDAS.map((a, position) => ({ ...a, position })));
  comprobar(error, "crear las áreas sugeridas");
}

export async function cambiarArea(
  id: string,
  cambios: Partial<
    DatosArea & { archived_at: string | null; position: number }
  >,
) {
  const supabase = await createClient();
  const guardar = (c: typeof cambios) =>
    supabase.from("areas").update(c).eq("id", id);
  let { error } = await guardar(cambios);
  if (faltaColor(error) && "color" in cambios)
    ({ error } = await guardar(sinColor(cambios)));
  comprobar(error, "cambiar el área");
}

// Sube o baja un área en la lista y vuelve a numerar las activas (0, 1, 2...).
export async function moverArea(id: string, paso: -1 | 1) {
  const supabase = await createClient();
  const activas = (await listarAreas()).filter((a) => !a.archived_at);
  const ids = moverEnLista(
    activas.map((a) => a.id),
    id,
    paso,
  );
  for (const [position, areaId] of ids.entries()) {
    if (activas.find((a) => a.id === areaId)?.position === position) continue;
    const { error } = await supabase
      .from("areas")
      .update({ position })
      .eq("id", areaId);
    comprobar(error, "ordenar las áreas");
  }
}

// Borra el área y sus proyectos (la base de datos lo hace sola).
export async function borrarArea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("areas").delete().eq("id", id);
  comprobar(error, "borrar el área");
}

// Cuántos proyectos activos tiene cada área, para la lista.
export async function contarProyectosPorArea() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("area_id")
    .is("archived_at", null)
    .limit(1000);
  comprobar(error, "contar los proyectos");
  const cuenta = new Map<string, number>();
  for (const p of data ?? [])
    cuenta.set(p.area_id, (cuenta.get(p.area_id) ?? 0) + 1);
  return cuenta;
}

export async function listarProyectos(areaId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(CAMPOS_PROYECTO)
    .eq("area_id", areaId)
    .limit(200);
  comprobar(error, "cargar los proyectos");
  return ordenarProyectos((data ?? []) as Proyecto[]);
}

// Todos tus proyectos (de todas las áreas), para el selector de las tareas.
export async function listarTodosLosProyectos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(CAMPOS_PROYECTO)
    .limit(500);
  comprobar(error, "cargar los proyectos");
  return (data ?? []) as Proyecto[];
}

// Las opciones del selector «Proyecto» de las tareas, agrupadas por área.
export async function cargarOpcionesProyecto() {
  const [areas, proyectos] = await Promise.all([
    listarAreas(),
    listarTodosLosProyectos(),
  ]);
  return { areas, proyectos };
}

export async function leerProyecto(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(CAMPOS_PROYECTO)
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer el proyecto");
  return (data as Proyecto | null) ?? null;
}

export async function crearProyecto(areaId: string, datos: DatosProyecto) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .insert({ ...datos, area_id: areaId });
  comprobar(error, "guardar el proyecto");
}

export async function cambiarProyecto(
  id: string,
  cambios: Partial<DatosProyecto & { archived_at: string | null }>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update(cambios)
    .eq("id", id);
  comprobar(error, "cambiar el proyecto");
}

export async function borrarProyecto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  comprobar(error, "borrar el proyecto");
}
