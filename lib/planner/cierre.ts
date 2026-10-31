import { z } from "zod";
import type { Resultado } from "./bandeja";
import { horaEn, hoyEn } from "./fechas";

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
// "limites": dónde empieza y acaba tu día ("2026-10-30 09:10" y
// "2026-10-31 01:30", ver finDelDia en dia-activo.ts). Así una tarea hecha a
// la 01:00, antes de irte a dormir, cuenta en tu día. Sin límites, el día va
// de medianoche a medianoche.
export function hechasEnDia<T extends { done_at: string | null }>(
  tareas: T[],
  dia: string,
  zona: string,
  limites?: { desde: string; hasta: string },
): T[] {
  return tareas.filter((t) => {
    if (t.done_at === null) return false;
    const momento = new Date(t.done_at);
    if (!limites) return hoyEn(zona, momento) === dia;
    const local = `${hoyEn(zona, momento)} ${horaEn(zona, momento)}`;
    return local >= limites.desde && local < limites.hasta;
  });
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
