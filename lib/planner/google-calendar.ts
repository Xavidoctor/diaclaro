import { compararOcurrencias, type Ocurrencia } from "./agenda";
import { diasDesde, horaEn, hoyEn, sumarDias } from "./fechas";

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
