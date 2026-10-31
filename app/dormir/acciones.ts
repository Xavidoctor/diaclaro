"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerDiaDeHoy } from "@/lib/data/dia-activo";
import { borrarHoraDormir, guardarHoraDormir } from "@/lib/data/dormir";
import { leerHoraDormir, leerMotivoTarde, nocheDe } from "@/lib/planner/dormir";
import { horaEn, hoyEn, sumarDias } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// Acciones de la pantalla "Me voy a dormir".
// El día y la hora se calculan aquí, en tu zona horaria; no los manda el navegador.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// La noche de ahora y la anterior: las únicas que se pueden cambiar aquí.
async function nochesPermitidas() {
  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  const ahora = horaEn(timezone);
  const estaNoche = nocheDe(hoy, sumarDias(hoy, -1), ahora);
  return { ahora, estaNoche, anoche: sumarDias(estaNoche, -1) };
}

// El botón grande: guarda la hora de ahora.
export async function meVoyADormir() {
  await exigirSesion();
  const { ahora, estaNoche } = await nochesPermitidas();
  await guardarHoraDormir({ on_date: estaNoche, bed_time: ahora });
  refresh();
}

// "¿Se te olvidó?": pones tú la hora aproximada de esta noche o de anoche.
export async function guardarHoraAMano(formData: FormData) {
  await exigirSesion();
  const { estaNoche, anoche } = await nochesPermitidas();
  const noche = formData.get("noche") === anoche ? anoche : estaNoche;
  const hora = leerHoraDormir(formData.get("bed_time"));
  // Si la hora no es válida, no se guarda nada (la app no se la inventa).
  if (!hora.ok) return;
  await guardarHoraDormir({ on_date: noche, bed_time: hora.valor });
  refresh();
}

export async function deshacerHoraDormir(formData: FormData) {
  await exigirSesion();
  const { estaNoche, anoche } = await nochesPermitidas();
  const noche = formData.get("noche");
  if (noche !== estaNoche && noche !== anoche) return;
  await borrarHoraDormir(noche);
  refresh();
}

// «¿No te dormiste al pulsar?», debajo de los botones de la mañana: cambia la
// hora de la noche anterior al día que empiezas. Así tus horas de sueño son
// las de verdad. "envios" cuenta los guardados buenos, para cerrar el formulario.
export type CorregirDormirState = { error?: string; envios: number };

export async function corregirHoraDeAnoche(
  estado: CorregirDormirState,
  formData: FormData,
): Promise<CorregirDormirState> {
  await exigirSesion();
  const hora = leerHoraDormir(formData.get("bed_time"));
  if (!hora.ok) return { error: hora.error, envios: estado.envios };
  const { abrir } = await leerDiaDeHoy();
  // El motivo es opcional. Si no lo pones (o la hora ya no es más tarde y
  // el formulario no lo enseña), se borra el que hubiera.
  const motivo = leerMotivoTarde(
    formData.get("late_reason"),
    formData.get("late_note"),
  );
  await guardarHoraDormir(
    { on_date: sumarDias(abrir, -1), bed_time: hora.valor },
    motivo,
  );
  refresh();
  return { envios: estado.envios + 1 };
}
