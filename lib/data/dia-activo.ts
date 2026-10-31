import "server-only";
import { cache } from "react";
import { leerAjustes } from "@/lib/data/ajustes";
import { horaCorta } from "@/lib/planner/agenda";
import {
  diaActivo,
  diaParaAbrir,
  finDelDia,
  type DiaActivo,
} from "@/lib/planner/dia-activo";
import { horaEn, hoyEn, sumarDias } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// Qué día es ahora para ti: empieza al pulsar «Despierto» o «Levantado» y
// acaba al pulsar «Me voy a dormir» (las reglas están en lib/planner/dia-activo.ts).
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

export type DiaDeHoy = DiaActivo & {
  calendario: string; // la fecha del reloj
  abrir: string; // el día que abren los botones «Despierto» y «Levantado»
};

// "cache": si varias partes de la misma pantalla lo piden, se lee una sola vez.
export const leerDiaDeHoy = cache(async (): Promise<DiaDeHoy> => {
  const { timezone } = await leerAjustes();
  const ahora = new Date();
  const calendario = hoyEn(timezone, ahora);
  const hora = horaEn(timezone, ahora);
  const ayer = sumarDias(calendario, -1);

  const supabase = await createClient();
  const [inicios, dormir] = await Promise.all([
    supabase
      .from("day_starts")
      .select("on_date")
      .in("on_date", [ayer, calendario]),
    supabase
      .from("bedtimes")
      .select("on_date, bed_time")
      .in("on_date", [ayer, calendario]),
  ]);
  if (inicios.error)
    throw new Error(
      `No se ha podido leer el inicio del día: ${inicios.error.message}`,
    );
  // Si algo falla con las horas de dormir, el día se calcula sin ellas.
  const horas = dormir.error ? [] : (dormir.data ?? []);
  const abiertos = new Set(
    (inicios.data ?? []).map((i) => i.on_date as string),
  );
  const horaDe = (fecha: string) => {
    const h = horas.find((d) => d.on_date === fecha);
    return h ? horaCorta(h.bed_time as string) : null;
  };

  const activo = diaActivo({
    calendario,
    hora,
    abiertoHoy: abiertos.has(calendario),
    abiertoAyer: abiertos.has(ayer),
    dormirAyer: horaDe(ayer),
    dormirHoy: horaDe(calendario),
  });
  return { ...activo, calendario, abrir: diaParaAbrir(activo, calendario) };
});

// Atajo: solo la fecha del día en el que estás, como "2026-10-30".
export async function diaDeHoy(): Promise<string> {
  return (await leerDiaDeHoy()).dia;
}

// Dónde empieza y acaba el día `dia`, con tus botones de ese día y de los de
// al lado. Sirve para contar lo que hiciste de madrugada en el día correcto.
export async function leerLimitesDelDia(
  dia: string,
): Promise<{ desde: string; hasta: string }> {
  const ayer = sumarDias(dia, -1);
  const manana = sumarDias(dia, 1);
  const supabase = await createClient();
  const [inicios, dormir] = await Promise.all([
    supabase
      .from("day_starts")
      .select("on_date, awake_time, start_time")
      .in("on_date", [ayer, dia, manana]),
    supabase
      .from("bedtimes")
      .select("on_date, bed_time")
      .in("on_date", [ayer, dia]),
  ]);
  if (inicios.error)
    throw new Error(
      `No se ha podido leer el inicio del día: ${inicios.error.message}`,
    );
  const filas = (inicios.data ?? []) as {
    on_date: string;
    awake_time: string | null;
    start_time: string | null;
  }[];
  const horas = dormir.error ? [] : (dormir.data ?? []);
  const inicio = (fecha: string) => filas.find((i) => i.on_date === fecha);
  const abre = (fecha: string) => {
    const i = inicio(fecha);
    return i ? horaCorta(i.awake_time ?? i.start_time) : null;
  };
  const duerme = (fecha: string) => {
    const h = horas.find((d) => d.on_date === fecha);
    return h ? horaCorta(h.bed_time as string) : null;
  };
  const botones = (fecha: string) => ({
    abierto: inicio(fecha) !== undefined,
    dormir: duerme(fecha),
    abreSiguiente: abre(sumarDias(fecha, 1)),
  });
  return {
    desde: finDelDia(ayer, botones(ayer)),
    hasta: finDelDia(dia, botones(dia)),
  };
}
