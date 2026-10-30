"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { guardarCierre } from "@/lib/data/cierre";
import { prepararCierre } from "@/lib/planner/cierre";
import { esFecha } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// Acción del cierre del día. Se ejecuta en el servidor.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export type CierreState = {
  envios: number;
  error?: string;
  guardado?: boolean;
  valores?: { achieved: string; change_tomorrow: string };
};

export async function guardarCierreDelDia(
  prev: CierreState,
  formData: FormData,
): Promise<CierreState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = {
    achieved: String(formData.get("achieved") ?? ""),
    change_tomorrow: String(formData.get("change_tomorrow") ?? ""),
  };
  const dia = String(formData.get("dia") ?? "");
  if (!esFecha(dia)) return { envios, error: "El día no es válido.", valores };

  const r = prepararCierre(valores);
  if (!r.ok) return { envios, error: r.error, valores };
  await guardarCierre({ on_date: dia, ...r.valor });
  refresh();
  return { envios, guardado: true, valores };
}
