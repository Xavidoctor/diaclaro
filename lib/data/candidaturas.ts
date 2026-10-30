import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ordenarHistorial,
  type Candidatura,
  type DatosCandidatura,
  type DatosEntrada,
  type EntradaHistorial,
} from "@/lib/planner/candidaturas";

// Única parte de las Candidaturas de empleo que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

const CAMPOS =
  "id, company, role, url, status, applied_on, next_follow_up, next_step, notes, created_at";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function listarCandidaturas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select(CAMPOS)
    .order("created_at", { ascending: false })
    .limit(500);
  comprobar(error, "cargar las candidaturas");
  return (data ?? []) as Candidatura[];
}

// Las que tienen seguimiento hasta el día indicado (para la tarjeta de Hoy).
export async function listarSeguimientosHasta(dia: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select(CAMPOS)
    .lte("next_follow_up", dia)
    .not("status", "in", "(rechazada,descartada)")
    .order("next_follow_up")
    .limit(50);
  comprobar(error, "cargar los seguimientos de empleo");
  return (data ?? []) as Candidatura[];
}

export async function leerCandidatura(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select(CAMPOS)
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer la candidatura");
  return (data as Candidatura | null) ?? null;
}

export async function crearCandidatura(datos: DatosCandidatura) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .insert(datos)
    .select("id")
    .single();
  comprobar(error, "guardar la candidatura");
  return (data as { id: string }).id;
}

export async function cambiarCandidatura(
  id: string,
  cambios: Partial<DatosCandidatura>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_applications")
    .update(cambios)
    .eq("id", id);
  comprobar(error, "cambiar la candidatura");
}

export async function borrarCandidatura(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", id);
  comprobar(error, "borrar la candidatura");
}

// ---- Historial ----

export async function listarHistorial(applicationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_application_events")
    .select("id, application_id, on_date, kind, status, note, created_at")
    .eq("application_id", applicationId)
    .limit(300);
  comprobar(error, "cargar el historial");
  return ordenarHistorial((data ?? []) as EntradaHistorial[]);
}

export async function anadirAlHistorial(
  applicationId: string,
  entrada: DatosEntrada,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_application_events")
    .insert({ ...entrada, application_id: applicationId });
  comprobar(error, "guardar en el historial");
}

export async function borrarDelHistorial(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_application_events")
    .delete()
    .eq("id", id);
  comprobar(error, "borrar del historial");
}
