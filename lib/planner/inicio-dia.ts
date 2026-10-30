import type { Ajustes } from "./ajustes";
import { horaOpcional } from "./agenda";
import type { RutinaDelDia } from "./rutinas";

// "Empiezo el día". Funciones puras, con pruebas en inicio-dia.test.ts.
//
// Cuando pulsas el botón, la app guarda la hora. Desde ese momento el día se
// calcula desde tu hora real de empezar, no desde la de Ajustes.
// Si no tienes hora de acostarte en Ajustes, la pide una vez para ese día.
//
// Hay dos botones: "Despierto" (te has despertado, pero sigues en la cama) y
// "Levantado" (el antiguo "Empiezo el día"). Puedes pulsar solo uno o los dos.

export type InicioDia = {
  on_date: string; // "2026-10-30"
  awake_time: string | null; // "9:50": cuando pulsaste "Despierto"
  start_time: string | null; // "10:12": cuando pulsaste "Levantado"
  sleep_time: string | null; // solo para ese día; null = la de Ajustes
};

// En qué punto de la mañana estás.
export type EstadoDespertar = "sin-empezar" | "despierto" | "levantado";

export function estadoDespertar(inicio: InicioDia | null): EstadoDespertar {
  if (inicio?.start_time) return "levantado";
  if (inicio?.awake_time) return "despierto";
  return "sin-empezar";
}

// Los ajustes que valen hoy: tu hora real de levantarte (o de despertarte,
// si aún no has pulsado "Levantado") y, si la pusiste, la hora de acostarte de hoy.
export function ajustesDelDia(
  ajustes: Ajustes,
  inicio: InicioDia | null,
): Ajustes {
  if (!inicio) return ajustes;
  return {
    ...ajustes,
    wake_time: inicio.start_time ?? inicio.awake_time ?? ajustes.wake_time,
    sleep_time: inicio.sleep_time ?? ajustes.sleep_time,
  };
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Minutos entre "Despierto" y "Levantado". null si falta alguna de las dos
// o si las horas no tienen sentido (Levantado antes que Despierto).
export function minutosEnLaCama(inicio: InicioDia | null): number | null {
  if (!inicio?.awake_time || !inicio.start_time) return null;
  const minutos = aMinutos(inicio.start_time) - aMinutos(inicio.awake_time);
  return minutos >= 0 ? minutos : null;
}

// Una frase amable sobre el rato en la cama. Sin juzgar: solo es un dato.
export function textoEnLaCama(minutos: number | null): string | null {
  if (minutos === null) return null;
  if (minutos < 5) return "Te has levantado enseguida.";
  if (minutos < 60)
    return `Has estado ${minutos} min en la cama antes de levantarte.`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `Has estado ${h} h${m ? ` ${m} min` : ""} en la cama antes de levantarte.`;
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
