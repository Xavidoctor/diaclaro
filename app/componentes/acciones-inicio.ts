"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerDiaDeHoy } from "@/lib/data/dia-activo";
import { borrarInicio, guardarInicio } from "@/lib/data/inicio-dia";
import { horaEn } from "@/lib/planner/fechas";
import {
  leerHoraAcostarse,
  leerHorasDespertar,
} from "@/lib/planner/inicio-dia";
import { createClient } from "@/lib/supabase/server";

// Acciones de los botones "Despierto" y "Levantado" (antes "Empiezo el día").
// El día y la hora se calculan aquí, en tu zona horaria; no los manda el navegador.
// El día es el que abren los botones: si sigues en el de ayer (de madrugada,
// sin haber pulsado «Me voy a dormir»), es el día nuevo del reloj.

async function diaQueAbres() {
  return (await leerDiaDeHoy()).abrir;
}

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// "Despierto": te has despertado, pero sigues en la cama.
export async function marcarDespierto() {
  await exigirSesion();
  const { timezone } = await leerAjustes();
  await guardarInicio({
    on_date: await diaQueAbres(),
    awake_time: horaEn(timezone),
  });
  refresh();
}

// "Levantado": empieza el día. Si vienes de la pantalla /despierto,
// te lleva a Hoy.
export async function empezarDia(formData: FormData) {
  await exigirSesion();
  const { timezone } = await leerAjustes();
  const acostarse = leerHoraAcostarse(formData.get("sleep_time"));
  await guardarInicio({
    on_date: await diaQueAbres(),
    start_time: horaEn(timezone),
    // Si la hora no es válida, se queda vacía (la app no se la inventa).
    sleep_time: acostarse.ok ? acostarse.valor : null,
  });
  if (formData.get("ir_a_hoy")) redirect("/");
  refresh();
}

// Corregir las horas a mano: si no pulsaste el botón justo al despertarte o
// al levantarte, pones la hora aproximada. Así los datos de tu día son buenos.
// "envios" cuenta los guardados buenos, para cerrar el formulario después.
export type CorregirHorasState = { error?: string; envios: number };

export async function corregirHoras(
  estado: CorregirHorasState,
  formData: FormData,
): Promise<CorregirHorasState> {
  await exigirSesion();
  const { timezone } = await leerAjustes();
  const horas = leerHorasDespertar(
    formData.get("awake_time"),
    formData.get("start_time"),
    horaEn(timezone),
  );
  if (!horas.ok) return { error: horas.error, envios: estado.envios };
  await guardarInicio({
    on_date: await diaQueAbres(),
    awake_time: horas.awake_time,
    start_time: horas.start_time,
  });
  refresh();
  return { envios: estado.envios + 1 };
}

export async function deshacerInicioDia() {
  await exigirSesion();
  await borrarInicio(await diaQueAbres());
  refresh();
}
