import { z } from "zod";
import type { Resultado } from "./bandeja";
import { hoyEn } from "./fechas";

// Reglas del cierre del día. Funciones puras, con pruebas en cierre.test.ts.
//
// Al acabar el día respondes dos preguntas: qué has conseguido hoy y qué
// cambiarías mañana. Lo que escribas en la segunda te sale al día siguiente en Hoy.

export const MAX_TEXTO_CIERRE = 3000;

export type Cierre = {
  on_date: string;
  achieved: string | null;
  change_tomorrow: string | null;
};

const texto = z
  .string()
  .max(MAX_TEXTO_CIERRE, `Como mucho ${MAX_TEXTO_CIERRE} caracteres.`)
  .transform((t) => t.trim() || null);

const esquema = z.object({ achieved: texto, change_tomorrow: texto });

// Comprueba las dos respuestas. Una puede ir vacía, pero no las dos.
export function prepararCierre(formulario: {
  achieved: unknown;
  change_tomorrow: unknown;
}): Resultado<Omit<Cierre, "on_date">> {
  const r = esquema.safeParse({
    achieved: formulario.achieved ?? "",
    change_tomorrow: formulario.change_tomorrow ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  if (!r.data.achieved && !r.data.change_tomorrow)
    return { ok: false, error: "Escribe al menos una de las dos respuestas." };
  return { ok: true, valor: r.data };
}

// Las tareas que marcaste como hechas ese día (en tu zona horaria).
// done_at es un momento exacto ("2026-10-30T22:30:00Z"), que en Madrid puede
// ser ya el día siguiente; por eso se convierte antes de comparar.
export function hechasEnDia<T extends { done_at: string | null }>(
  tareas: T[],
  dia: string,
  zona: string,
): T[] {
  return tareas.filter(
    (t) => t.done_at !== null && hoyEn(zona, new Date(t.done_at)) === dia,
  );
}

// Si cierras el día de madrugada (antes de las 5), lo normal es que estés
// cerrando el de ayer. "hora" es la hora local, de 0 a 23.
export const HORA_CAMBIO_DE_DIA = 5;

export function diaACerrar(hoy: string, ayer: string, hora: number): string {
  return hora < HORA_CAMBIO_DE_DIA ? ayer : hoy;
}

// La hora (0 a 23) en la zona horaria indicada.
export function horaLocal(zona: string, ahora = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(ahora);
  return Number(h);
}
