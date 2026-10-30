import { compararOcurrencias, type Ocurrencia } from "./agenda";
import { diasDesde, esFecha, horaEn, hoyEn, sumarDias } from "./fechas";

// Reglas para enseñar tu Google Calendar en DíaClaro. Funciones puras, con
// pruebas en google-calendar.test.ts. No hablan con Google: eso lo hace
// lib/google/api.ts, y aquí solo se convierten sus eventos al formato de la Agenda.
//
// DíaClaro solo LEE Google Calendar: nunca crea, cambia ni borra nada allí.

// Lo que nos quedamos de cada evento de Google.
export type EventoGoogle = {
  id: string;
  calendario: string; // id del calendario de Google del que viene
  titulo: string | null;
  // Google usa "date" para los eventos de todo el día ("2026-10-30")
  // y "dateTime" para los que tienen hora ("2026-10-30T16:00:00+01:00").
  inicio: { date?: string; dateTime?: string };
  fin: { date?: string; dateTime?: string };
  libre: boolean; // en Google está marcado como «Disponible»
};

export const SIN_TITULO = "(Sin título)";

// Día y hora de un instante en tu zona horaria: ["2026-10-30", "16:00"].
function enTuZona(instante: string, zona: string): [string, string] {
  const fecha = new Date(instante);
  return [hoyEn(zona, fecha), horaEn(zona, fecha)];
}

// Convierte los eventos de Google en apariciones de la Agenda entre dos días.
// - Un evento de todo el día sale en cada día que dura, sin hora.
// - Un evento con hora que pasa de un día a otro se parte: el primer día
//   hasta las 23:59, los días de en medio sin hora y el último desde las 00:00.
export function ocurrenciasDeGoogle(
  eventos: EventoGoogle[],
  zona: string,
  desde: string,
  hasta: string,
): Ocurrencia[] {
  const resultado: Ocurrencia[] = [];

  for (const evento of eventos) {
    const base = {
      eventoId: `google:${evento.calendario}:${evento.id}`,
      titulo: evento.titulo?.trim() || SIN_TITULO,
      franja: null,
      seRepite: false,
      cambiada: false,
      google: { libre: evento.libre },
    };
    const anadir = (
      fecha: string,
      horaInicio: string | null,
      horaFin: string | null,
    ) => {
      if (fecha < desde || fecha > hasta) return;
      resultado.push({
        ...base,
        fecha,
        fechaOriginal: fecha,
        horaInicio,
        horaFin,
      });
    };

    if (evento.inicio.date) {
      // Todo el día. En Google el último día no cuenta: un evento solo del
      // día 30 tiene inicio el 30 y fin el 31.
      const fin = evento.fin.date ?? sumarDias(evento.inicio.date, 1);
      for (const fecha of diasEntre(evento.inicio.date, fin)) {
        anadir(fecha, null, null);
      }
      continue;
    }

    if (!evento.inicio.dateTime || !evento.fin.dateTime) continue;
    const [diaInicio, horaInicio] = enTuZona(evento.inicio.dateTime, zona);
    const [diaFin, horaFin] = enTuZona(evento.fin.dateTime, zona);

    if (diaFin <= diaInicio) {
      anadir(diaInicio, horaInicio, horaFin);
      continue;
    }
    anadir(diaInicio, horaInicio, "23:59");
    for (const fecha of diasEntre(sumarDias(diaInicio, 1), diaFin)) {
      anadir(fecha, null, null);
    }
    // Si acaba justo a medianoche, el último día no tiene nada.
    if (horaFin !== "00:00") anadir(diaFin, "00:00", horaFin);
  }

  return resultado.sort(compararOcurrencias);
}

// Los días desde "desde" hasta el anterior a "antesDe".
// Con un tope de un año por si llega un evento rarísimo.
function diasEntre(desde: string, antesDe: string): string[] {
  const dias = diasDesde(desde, 366);
  const fin = dias.indexOf(antesDe);
  return fin === -1 ? dias.filter((d) => d < antesDe) : dias.slice(0, fin);
}

// Junta tu agenda de DíaClaro con la de Google, en orden.
export function juntarAgendas(
  propias: Ocurrencia[],
  deGoogle: Ocurrencia[],
): Ocurrencia[] {
  return [...propias, ...deGoogle].sort(compararOcurrencias);
}

// ---- Pasar un evento de Google a tus tareas ----

// Lo que identifica un evento de Google en un día concreto
// (un evento de varios días puede pasarse a tarea cada día por separado).
export function claveGoogle(o: Pick<Ocurrencia, "eventoId" | "fecha">): string {
  return `${o.eventoId}|${o.fecha}`;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Prepara la tarea a partir del evento. La fecha y los minutos salen del
// propio evento de Google; si no tiene horas, la tarea queda sin minutos.
export function tareaDesdeGoogle(datos: {
  clave: unknown;
  titulo: unknown;
  fecha: unknown;
  inicio: unknown;
  fin: unknown;
}):
  | {
      ok: true;
      tarea: {
        title: string;
        due_date: string;
        estimated_minutes: number | null;
        google_event: string;
      };
    }
  | { ok: false; error: string } {
  const { clave, titulo, fecha, inicio, fin } = datos;
  if (typeof clave !== "string" || !clave.startsWith("google:"))
    return { ok: false, error: "Ese evento no es de Google." };
  if (clave.length > 1100) return { ok: false, error: "Evento no válido." };
  if (typeof fecha !== "string" || !esFecha(fecha))
    return { ok: false, error: "Fecha no válida." };
  const title = (typeof titulo === "string" ? titulo.trim() : "").slice(0, 500);
  if (!title) return { ok: false, error: "Falta el título." };

  let estimated_minutes: number | null = null;
  if (typeof inicio === "string" && typeof fin === "string") {
    if (HORA.test(inicio) && HORA.test(fin)) {
      const minutos = minutosDelDia(fin) - minutosDelDia(inicio);
      // 23:59 es «hasta medianoche» (ver ocurrenciasDeGoogle).
      const total = fin === "23:59" ? minutos + 1 : minutos;
      if (total >= 1 && total <= 1440) estimated_minutes = total;
    }
  }
  return {
    ok: true,
    tarea: { title, due_date: fecha, estimated_minutes, google_event: clave },
  };
}

function minutosDelDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
