import type { Ocurrencia } from "./agenda";
import { sumarDias } from "./fechas";
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
      bloque: { tipo: "tarea", id: t.id, hecha: Boolean(t.done_at) },
    }));
}

// Las rutinas activas con hora, en cada día entre dos fechas (incluidas). Una rutina de
// varias veces al día da un bloque por cada vez que tenga hora. El fin es
// el «Hasta» o, si no lo hay, la hora más los minutos de cada vez.
// Las rutinas sin hora no salen: no ocupan un rato fijo.
export function bloquesDeRutinas(
  rutinas: Pick<
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
  >[],
  desde: string,
  hasta: string,
): Ocurrencia[] {
  const dias: string[] = [];
  for (let d = desde; d <= hasta && dias.length < 400; d = sumarDias(d, 1))
    dias.push(d);
  const fin = (inicio: string, minutos: number | null) =>
    minutos ? sumarMinutosAHora(inicio, minutos) : null;
  return dias.flatMap((fecha) =>
    rutinas
      .filter((r) => r.active && tocaRutina(r, fecha))
      .flatMap((r) => {
        const tramos: { inicio: string; fin: string | null }[] =
          r.times_per_day > 1 && r.times_of_day
            ? r.times_of_day
                .slice(0, r.times_per_day)
                .filter((h): h is string => h !== null)
                .map((h) => ({ inicio: h, fin: fin(h, r.duration_minutes) }))
            : r.window_start
              ? [
                  {
                    inicio: r.window_start,
                    fin:
                      r.window_end ?? fin(r.window_start, r.duration_minutes),
                  },
                ]
              : [];
        return tramos.map(
          (t, i): Ocurrencia => ({
            eventoId: `rutina-${r.id}-${i + 1}`,
            titulo: r.title,
            fecha,
            fechaOriginal: fecha,
            horaInicio: t.inicio,
            horaFin: t.fin,
            franja: null,
            seRepite: true,
            cambiada: false,
            bloque: { tipo: "rutina", id: r.id, hecha: false },
          }),
        );
      }),
  );
}
