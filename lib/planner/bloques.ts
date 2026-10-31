import type { Ocurrencia } from "./agenda";
import { sumarDias } from "./fechas";
import {
  estaMovida,
  rutinaEseDia,
  rutinaFija,
  type MovidaRutina,
} from "./mover-dia";
import { sumarMinutosAHora } from "./propuestas";
import { tocaRutina, type Rutina } from "./rutinas";

// Bloques de horas: las tareas y rutinas con hora que ocupan un rato del día.
// Salen en la Agenda junto a tus compromisos, sea del proyecto que sea
// (Trabajo, una asignatura...). Funciones puras, con pruebas en bloques.test.ts.

type TareaConHora = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  done_at: string | null;
};

// "10:00–11:30" (con minutos) o "10:00" (sin minutos).
export function textoHoraTarea(
  t: Pick<TareaConHora, "due_time" | "estimated_minutes">,
): string | null {
  if (!t.due_time) return null;
  const fin = t.estimated_minutes
    ? sumarMinutosAHora(t.due_time, t.estimated_minutes)
    : null;
  return fin ? `${t.due_time}–${fin}` : t.due_time;
}

// Las tareas con día y hora entre dos fechas (las dos incluidas).
export function bloquesDeTareas(
  tareas: TareaConHora[],
  desde: string,
  hasta: string,
): Ocurrencia[] {
  return tareas
    .filter(
      (t) =>
        t.due_date && t.due_time && t.due_date >= desde && t.due_date <= hasta,
    )
    .map((t) => ({
      eventoId: `tarea-${t.id}`,
      titulo: t.title,
      fecha: t.due_date!,
      fechaOriginal: t.due_date!,
      horaInicio: t.due_time,
      horaFin: t.estimated_minutes
        ? sumarMinutosAHora(t.due_time!, t.estimated_minutes)
        : null,
      franja: null,
      seRepite: false,
      cambiada: false,
      // Las tareas con hora siempre se pueden mover.
      bloque: {
        tipo: "tarea",
        id: t.id,
        hecha: Boolean(t.done_at),
        vez: 1,
        fija: false,
      },
    }));
}

// Las rutinas activas con hora, en cada día entre dos fechas (incluidas). Una rutina de
// varias veces al día da un bloque por cada vez que tenga hora. El fin es
// el «Hasta» o, si no lo hay, la hora más los minutos de cada vez.
// Las rutinas sin hora no salen: no ocupan un rato fijo.
// `movidas` son las horas que cambiaste solo un día (ver mover-dia.ts).
export function bloquesDeRutinas(
  rutinas: (Pick<
    Rutina,
    | "id"
    | "title"
    | "repeat_rule"
    | "times_per_day"
    | "duration_minutes"
    | "window_start"
    | "window_end"
    | "times_of_day"
    | "active"
    | "project_id"
  > & { fixed_time?: boolean | null })[],
  desde: string,
  hasta: string,
  movidas: MovidaRutina[] = [],
): Ocurrencia[] {
  const dias: string[] = [];
  for (let d = desde; d <= hasta && dias.length < 400; d = sumarDias(d, 1))
    dias.push(d);
  const fin = (inicio: string, minutos: number | null) =>
    minutos ? sumarMinutosAHora(inicio, minutos) : null;
  return dias.flatMap((fecha) =>
    rutinas
      .filter((r) => r.active && tocaRutina(r, fecha))
      .flatMap((original) => {
        const r = rutinaEseDia(original, movidas, fecha);
        const tramos: { vez: number; inicio: string; fin: string | null }[] =
          r.times_per_day > 1 && r.times_of_day
            ? r.times_of_day
                .slice(0, r.times_per_day)
                .map((h, i) => ({ vez: i + 1, hora: h }))
                .filter(
                  (t): t is { vez: number; hora: string } => t.hora !== null,
                )
                .map((t) => ({
                  vez: t.vez,
                  inicio: t.hora,
                  fin: fin(t.hora, r.duration_minutes),
                }))
            : r.window_start
              ? [
                  {
                    vez: 1,
                    inicio: r.window_start,
                    fin:
                      r.window_end ?? fin(r.window_start, r.duration_minutes),
                  },
                ]
              : [];
        return tramos.map(
          (t): Ocurrencia => ({
            eventoId: `rutina-${r.id}-${t.vez}`,
            titulo: r.title,
            fecha,
            fechaOriginal: fecha,
            horaInicio: t.inicio,
            horaFin: t.fin,
            franja: null,
            seRepite: true,
            cambiada: estaMovida(movidas, r.id, fecha, t.vez),
            bloque: {
              tipo: "rutina",
              id: r.id,
              hecha: false,
              vez: t.vez,
              fija: rutinaFija(r),
            },
          }),
        );
      }),
  );
}
