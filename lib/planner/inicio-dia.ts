import type { Ajustes } from "./ajustes";
import { horaOpcional } from "./agenda";
import type { RutinaDelDia } from "./rutinas";

// "Empiezo el día". Funciones puras, con pruebas en inicio-dia.test.ts.
//
// Cuando pulsas el botón, la app guarda la hora. Desde ese momento el día se
// calcula desde tu hora real de empezar, no desde la de Ajustes.
// Si no tienes hora de acostarte en Ajustes, la pide una vez para ese día.

export type InicioDia = {
  on_date: string; // "2026-10-30"
  start_time: string; // "10:12"
  sleep_time: string | null; // solo para ese día; null = la de Ajustes
};

// Los ajustes que valen hoy: tu hora real de empezar y, si la pusiste al
// empezar, la hora de acostarte de hoy.
export function ajustesDelDia(
  ajustes: Ajustes,
  inicio: InicioDia | null,
): Ajustes {
  if (!inicio) return ajustes;
  return {
    ...ajustes,
    wake_time: inicio.start_time,
    sleep_time: inicio.sleep_time ?? ajustes.sleep_time,
  };
}

// Lee la hora de acostarte que llega del formulario. Vacía = null.
// Devuelve un error si no es una hora válida.
export function leerHoraAcostarse(
  valor: unknown,
): { ok: true; valor: string | null } | { ok: false; error: string } {
  const r = horaOpcional.safeParse(valor ?? "");
  if (!r.success) return { ok: false, error: "La hora no es válida." };
  return { ok: true, valor: r.data };
}

// Lo primero al empezar el día: tu primera rutina pendiente (por ejemplo, el
// primer paseo del perro), según su franja. Solo mientras no hayas marcado
// ninguna rutina hoy; después ya la ves en la lista de Rutinas.
// "rutinas" llega ya ordenada por franja (ver rutinasDelDia).
export function primeraRutina(rutinas: RutinaDelDia[]): RutinaDelDia | null {
  if (rutinas.some((r) => r.hechas > 0)) return null;
  return rutinas.find((r) => !r.completa) ?? null;
}
