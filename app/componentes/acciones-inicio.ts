"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { leerAjustes } from "@/lib/data/ajustes";
import { borrarInicio, guardarInicio } from "@/lib/data/inicio-dia";
import { hoyEn, horaEn } from "@/lib/planner/fechas";
import { leerHoraAcostarse } from "@/lib/planner/inicio-dia";
import { createClient } from "@/lib/supabase/server";

// Acciones del botón "Empiezo el día". El día y la hora se calculan aquí,
// en tu zona horaria; no los manda el navegador.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export async function empezarDia(formData: FormData) {
  await exigirSesion();
  const { timezone } = await leerAjustes();
  const acostarse = leerHoraAcostarse(formData.get("sleep_time"));
  await guardarInicio({
    on_date: hoyEn(timezone),
    start_time: horaEn(timezone),
    // Si la hora no es válida, se queda vacía (la app no se la inventa).
    sleep_time: acostarse.ok ? acostarse.valor : null,
  });
  refresh();
}

export async function deshacerInicioDia() {
  await exigirSesion();
  const { timezone } = await leerAjustes();
  await borrarInicio(hoyEn(timezone));
  refresh();
}
