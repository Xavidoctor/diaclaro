import "server-only";
import { listarTareas } from "@/lib/data/bandeja";
import { cargarProgreso } from "@/lib/data/progreso";
import type { Ajustes } from "@/lib/planner/ajustes";
import {
  conocerte,
  DIAS_CONOCERTE,
  type SesionConHora,
} from "@/lib/planner/conocerte";
import { leerMotivo, type Motivo } from "@/lib/planner/dia-dificil";
import { horaEn, sumarDias } from "@/lib/planner/fechas";
import { factoresPorTipo } from "@/lib/planner/tiempos";
import { createClient } from "@/lib/supabase/server";

// Junta lo que has apuntado las últimas 4 semanas y deja las cuentas a
// lib/planner/conocerte.ts. Nada de esto se manda a la IA.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function cargarConocerte(hoy: string, ajustes: Ajustes) {
  const desde = sumarDias(hoy, -(DIAS_CONOCERTE - 1));
  const [tareas, progreso, sesiones, diasDificiles] = await Promise.all([
    listarTareas(false),
    cargarProgreso(desde, hoy, ajustes),
    sesionesConHora(desde, hoy),
    // Si aún no está la tabla de días difíciles, no cuentan.
    motivosDiasDificiles(desde, hoy).catch(() => [] as Motivo[]),
  ]);
  return conocerte({
    factores: factoresPorTipo(tareas),
    resumen: progreso.resumen,
    horas: progreso.horas,
    sesiones,
    horaLocal: (instante) => horaEn(ajustes.timezone, new Date(instante)),
    diasDificiles,
  });
}

async function sesionesConHora(
  desde: string,
  hasta: string,
): Promise<SesionConHora[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("started_at, minutes")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(2000);
  comprobar(error, "cargar las sesiones de foco");
  return (data ?? []) as SesionConHora[];
}

async function motivosDiasDificiles(
  desde: string,
  hasta: string,
): Promise<Motivo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hard_days")
    .select("reason")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(100);
  comprobar(error, "cargar los días difíciles");
  return (data ?? [])
    .map((d) => leerMotivo(d.reason))
    .filter((m): m is Motivo => m !== null);
}
