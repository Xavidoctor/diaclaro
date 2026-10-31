import "server-only";
import { cache } from "react";
import { leerConexionGoogle } from "@/lib/data/google";
import {
  PREFERENCIAS_INICIALES,
  seccionesVisibles,
  type PreferenciasSecciones,
  type Secciones,
} from "@/lib/planner/secciones";
import { createClient } from "@/lib/supabase/server";

// Qué secciones opcionales ves (Empleo y Documentos importantes).
// Las reglas están en lib/planner/secciones.ts.

export async function leerPreferenciasSecciones(): Promise<PreferenciasSecciones> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("show_jobs, show_documents")
    .maybeSingle();
  // Si la migración aún no está puesta, todo va en automático.
  if (error || !data) return PREFERENCIAS_INICIALES;
  return {
    empleo: (data.show_jobs as boolean | null) ?? null,
    documentos: (data.show_documents as boolean | null) ?? null,
  };
}

// "cache": Hoy, el panel y Áreas lo pueden pedir varias veces; se lee una vez.
export const leerSecciones = cache(async (): Promise<Secciones> => {
  const supabase = await createClient();
  const [preferencias, candidaturas, google] = await Promise.all([
    leerPreferenciasSecciones(),
    // Solo cuenta si hay alguna, sin traer los datos.
    supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true }),
    leerConexionGoogle().catch(() => null),
  ]);
  return seccionesVisibles(preferencias, {
    candidaturas: (candidaturas.count ?? 0) > 0,
    drive: Boolean(google?.drive),
  });
});

// Lo que eliges en Ajustes. Crea la fila de ajustes si aún no existe.
export async function guardarSecciones(secciones: Secciones) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase.from("settings").upsert(
    {
      user_id: userId,
      show_jobs: secciones.empleo,
      show_documents: secciones.documentos,
    },
    { onConflict: "user_id" },
  );
  if (error)
    throw new Error(`No se ha podido guardar las secciones: ${error.message}`);
}
