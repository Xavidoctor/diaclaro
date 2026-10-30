import type { Ocurrencia } from "./agenda";
import type { RutinaDelDia } from "./rutinas";

// Aviso de sobrecarga. Funciones puras, con pruebas en carga.test.ts.
//
// Suma lo que te queda por hacer hoy (tareas, agenda y rutinas) y lo compara
// con el tiempo que te queda hasta la hora de acostarte. Solo usa minutos que
// tú has puesto: si algo no tiene duración, no se inventa; se cuenta aparte
// para avisarte de que puede haber más.

export type TareaConMinutos = {
  title: string;
  estimated_minutes: number | null;
};

export type EntradaCarga = {
  ahora: string; // hora actual, "16:05"
  horaLevantarse: string | null; // de Ajustes
  horaAcostarse: string | null; // de Ajustes
  tareas: TareaConMinutos[]; // pendientes de hoy y atrasadas
  agenda: Ocurrencia[]; // la agenda de hoy
  rutinas: RutinaDelDia[]; // las rutinas de hoy
};

export type Carga =
  | { estado: "falta-hora-acostarse" }
  | {
      estado: "cabe" | "te-pasas";
      apuntado: number; // minutos que te quedan por hacer
      libre: number; // minutos hasta la hora de acostarte
      diferencia: number; // libre - apuntado (negativo si te pasas)
      sinDuracion: string[]; // cosas de hoy sin minutos
    };

// "16:05" → 965 minutos desde las 00:00.
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Minutos que quedan desde ahora hasta la hora de acostarte.
// Si te acuestas después de medianoche (por ejemplo, a la 01:00), se cuenta
// como hora del día siguiente.
export function minutosLibres(
  ahora: string,
  horaLevantarse: string | null,
  horaAcostarse: string,
): number {
  const levantarse = horaLevantarse ? aMinutos(horaLevantarse) : 0;
  let acostarse = aMinutos(horaAcostarse);
  let actual = aMinutos(ahora);
  // Sin hora de levantarte, si la de acostarte ya ha pasado hoy, se entiende
  // que es la de esta noche pasada la medianoche.
  const referencia = horaLevantarse ? levantarse : actual;
  if (acostarse <= referencia) acostarse += 24 * 60;
  // Pasada la medianoche pero antes de acostarte: sigue siendo "tu" día.
  if (actual < levantarse && actual + 24 * 60 < acostarse) actual += 24 * 60;
  // Si aún no te has levantado, el día empieza a tu hora de levantarte.
  const desde = Math.max(actual, levantarse);
  return Math.max(0, acostarse - desde);
}

// Minutos de agenda que quedan: lo que ya ha pasado no cuenta.
// Devuelve null si no se sabe cuánto dura.
function minutosEvento(o: Ocurrencia, ahora: number): number | null {
  if (!o.horaInicio) return null;
  const inicio = aMinutos(o.horaInicio);
  if (!o.horaFin) return inicio <= ahora ? 0 : null;
  const fin = aMinutos(o.horaFin);
  if (fin <= ahora) return 0;
  return fin - Math.max(inicio, ahora);
}

export function calcularCarga(entrada: EntradaCarga): Carga {
  const { ahora, horaLevantarse, horaAcostarse, tareas, agenda, rutinas } =
    entrada;
  if (!horaAcostarse) return { estado: "falta-hora-acostarse" };

  const actual = aMinutos(ahora);
  let apuntado = 0;
  const sinDuracion: string[] = [];

  for (const tarea of tareas) {
    if (tarea.estimated_minutes) apuntado += tarea.estimated_minutes;
    else sinDuracion.push(tarea.title);
  }

  for (const o of agenda) {
    const minutos = minutosEvento(o, actual);
    if (minutos === null) sinDuracion.push(o.titulo);
    else apuntado += minutos;
  }

  for (const { rutina, hechas, completa } of rutinas) {
    if (completa) continue;
    if (!rutina.duration_minutes) {
      sinDuracion.push(rutina.title);
      continue;
    }
    apuntado += (rutina.times_per_day - hechas) * rutina.duration_minutes;
  }

  const libre = minutosLibres(ahora, horaLevantarse, horaAcostarse);
  const diferencia = libre - apuntado;
  return {
    estado: diferencia < 0 ? "te-pasas" : "cabe",
    apuntado,
    libre,
    diferencia,
    sinDuracion,
  };
}

// 150 → "2 h 30 min"; 45 → "45 min"; 120 → "2 h".
export function textoDuracion(minutos: number): string {
  const total = Math.abs(Math.round(minutos));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
