import { horaOpcional } from "./agenda";

// "Me voy a dormir". Funciones puras, con pruebas en dormir.test.ts.
//
// Guardamos a qué hora te acuestas de verdad cada noche. La noche es la del
// día que terminas: si te acuestas a la 01:00 del sábado, sigue siendo la
// noche del viernes. Por eso cualquier hora antes de las 12:00 cuenta como
// pasada la medianoche (igual que al calcular el sueño en progreso.ts).

export const MEDIODIA = "12:00";

export type HoraDormir = {
  on_date: string; // el día que terminas, "2026-10-30"
  bed_time: string; // "23:40" o "01:10"
};

// A qué noche pertenece una hora: antes de las 12:00, a la del día anterior.
export function nocheDe(hoy: string, ayer: string, hora: string): string {
  return hora < MEDIODIA ? ayer : hoy;
}

// Lee la hora que llega del formulario. Aquí es obligatoria.
export function leerHoraDormir(
  valor: unknown,
): { ok: true; valor: string } | { ok: false; error: string } {
  const r = horaOpcional.safeParse(valor ?? "");
  if (!r.success) return { ok: false, error: "La hora no es válida." };
  if (r.data === null) return { ok: false, error: "Pon una hora." };
  return { ok: true, valor: r.data };
}

// "Te acostaste a las 23:40" / "Te acostaste a la 01:10".
export function textoAcostaste(hora: string): string {
  const articulo = hora.startsWith("01:") ? "a la" : "a las";
  return `Te acostaste ${articulo} ${hora}`;
}
