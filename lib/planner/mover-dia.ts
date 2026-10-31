import { z } from "zod";
import type { Ocurrencia } from "./agenda";
import { esFecha } from "./fechas";
import type { Rutina } from "./rutinas";

// Ordenar el día en la Agenda: lo fijo (clases, trabajo, tus compromisos y
// lo de Google) se queda quieto; lo flexible (como pasear a la perra) se
// mantiene pulsado y se mueve arriba o abajo para cambiarle la hora.
// Funciones puras, con pruebas en mover-dia.test.ts.

// Cada paso del dedo cambia la hora 15 minutos.
export const PASO_MINUTOS = 15;
// Lo que hay que mover el dedo para un paso (unos 4 mm en el móvil).
export const PX_POR_PASO = 16;
// Lo que hay que mantener pulsado para empezar a mover.
export const MS_PULSACION = 400;

const ULTIMO_MINUTO = 24 * 60 - PASO_MINUTOS; // 23:45

// "16:05" → 965 minutos desde las 00:00.
function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function aHora(minutos: number): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

// Cuántos pasos de 15 minutos son los píxeles que has movido el dedo
// (hacia abajo, más tarde; hacia arriba, más pronto).
export function pasosDesdePixeles(dy: number): number {
  return Math.round(dy / PX_POR_PASO) || 0;
}

// La hora nueva al mover `pasos` desde `hora`. Nunca antes de las 00:00
// ni después de las 23:45: el bloque se queda en el mismo día.
export function horaMovida(hora: string, pasos: number): string {
  const total = aMinutos(hora) + pasos * PASO_MINUTOS;
  return aHora(Math.min(ULTIMO_MINUTO, Math.max(0, total)));
}

// El fin nuevo, con la misma duración que tenía. Si se pasa de
// medianoche o no tenía fin, sin fin.
export function finMovido(
  inicio: string,
  fin: string | null,
  nuevoInicio: string,
): string | null {
  if (!fin) return null;
  const total = aMinutos(nuevoInicio) + (aMinutos(fin) - aMinutos(inicio));
  return total < 24 * 60 ? aHora(total) : null;
}

// ---- Qué es fijo y qué se puede mover ----

// Una rutina es fija si lo has dicho tú. Si no has dicho nada, lo es
// cuando va dentro de un proyecto (una clase, el trabajo); suelta, se mueve.
export function rutinaFija(
  r: Pick<Rutina, "project_id"> & { fixed_time?: boolean | null },
): boolean {
  return r.fixed_time ?? Boolean(r.project_id);
}

// ¿Se puede mover en la lista? Solo las tareas y rutinas con hora que no
// son fijas, y las clases grabadas que ese día se juntan con otra cosa.
// Tus compromisos de la Agenda y lo de Google, nunca.
export function sePuedeMover(o: Ocurrencia): boolean {
  return Boolean(
    o.bloque && (!o.bloque.fija || o.bloque.aOtraHora) && o.horaInicio,
  );
}

// ---- Mover una rutina solo un día ----

// «Este día, esta vez de la rutina, empieza a esta hora.»
export type MovidaRutina = {
  routine_id: string;
  on_date: string;
  slot: number; // 1, 2... (las de una vez al día usan la 1)
  start_time: string; // "18:30"
  end_time?: string | null; // si ese día acabó antes («Ya ha terminado»)
};

type RutinaConHora = Pick<
  Rutina,
  "id" | "times_per_day" | "times_of_day" | "window_start" | "window_end"
>;

// ¿La rutina tiene una hora por cada vez? Si no, su hora es el «Desde».
export function usaHoraPorVez(r: RutinaConHora): boolean {
  return r.times_per_day > 1 && r.times_of_day !== null;
}

// La rutina tal como queda ese día, con las horas que hayas movido.
// No cambia su horario de siempre: solo la copia de ese día.
export function rutinaEseDia<R extends RutinaConHora>(
  r: R,
  movidas: MovidaRutina[],
  fecha: string,
): R {
  const suyas = movidas.filter(
    (m) => m.routine_id === r.id && m.on_date === fecha,
  );
  if (suyas.length === 0) return r;
  if (usaHoraPorVez(r)) {
    const horas = [...r.times_of_day!];
    for (const m of suyas) {
      if (m.slot <= r.times_per_day && m.slot <= horas.length)
        horas[m.slot - 1] = m.start_time;
    }
    return {
      ...r,
      times_of_day: horas,
      // La primera hora también es el «Desde» (sirve para ordenar).
      window_start: horas.find((h) => h !== null) ?? r.window_start,
    };
  }
  const m = suyas.find((x) => x.slot === 1);
  if (!m || !r.window_start) return r;
  return {
    ...r,
    window_start: m.start_time,
    window_end:
      m.end_time ?? finMovido(r.window_start, r.window_end, m.start_time),
  };
}

// El cambio de una vez de la rutina ese día, si lo hay.
export function movidaDe(
  movidas: MovidaRutina[],
  rutinaId: string,
  fecha: string,
  vez: number,
): MovidaRutina | null {
  return (
    movidas.find(
      (m) => m.routine_id === rutinaId && m.on_date === fecha && m.slot === vez,
    ) ?? null
  );
}

// ¿Esa vez de la rutina está movida ese día?
export function estaMovida(
  movidas: MovidaRutina[],
  rutinaId: string,
  fecha: string,
  vez: number,
): boolean {
  return movidas.some(
    (m) => m.routine_id === rutinaId && m.on_date === fecha && m.slot === vez,
  );
}

// ---- Choques ----

export type RatoFijo = { titulo: string; inicio: string; fin: string | null };

// Lo fijo de un día con hora, para avisar si mueves algo encima.
export function ratosFijos(ocurrencias: Ocurrencia[]): RatoFijo[] {
  return ocurrencias
    .filter(
      (o) =>
        o.horaInicio &&
        !sePuedeMover(o) &&
        !o.google?.libre &&
        !o.bloque?.aOtraHora,
    )
    .map((o) => ({ titulo: o.titulo, inicio: o.horaInicio!, fin: o.horaFin }));
}

// Lo fijo con lo que choca un rato. Sin fin, cuenta solo su hora de inicio
// (la app no se inventa cuánto dura).
export function chocaCon(
  inicio: string,
  fin: string | null,
  fijos: RatoFijo[],
): RatoFijo | null {
  const a0 = aMinutos(inicio);
  const a1 = fin ? aMinutos(fin) : a0;
  return (
    fijos.find((f) => {
      const b0 = aMinutos(f.inicio);
      const b1 = f.fin ? aMinutos(f.fin) : b0;
      const aPunto = a0 === a1;
      const bPunto = b0 === b1;
      if (aPunto && bPunto) return a0 === b0;
      if (aPunto) return b0 <= a0 && a0 < b1;
      if (bPunto) return a0 <= b0 && b0 < a1;
      return a0 < b1 && b0 < a1;
    }) ?? null
  );
}

// ---- Lo que llega al soltar ----

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const esquemaMover = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("tarea"),
    id: z.uuid(),
    fecha: z.string().refine(esFecha),
    hora,
  }),
  z.object({
    tipo: z.literal("rutina"),
    id: z.uuid(),
    fecha: z.string().refine(esFecha),
    vez: z.number().int().min(1).max(20),
    hora,
  }),
]);

export type Movimiento = z.infer<typeof esquemaMover>;

// Comprueba lo que manda la pantalla al soltar el dedo.
export function leerMovimiento(datos: unknown): Movimiento | null {
  const r = esquemaMover.safeParse(datos);
  return r.success ? r.data : null;
}

// «Ya ha terminado»: un compromiso (evento) o una rutina acaba antes ese día.
const esquemaTerminar = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("evento"),
    id: z.uuid(),
    fecha: z.string().refine(esFecha),
    fechaOriginal: z.string().refine(esFecha),
    inicio: hora,
    fin: hora,
  }),
  z.object({
    tipo: z.literal("rutina"),
    id: z.uuid(),
    fecha: z.string().refine(esFecha),
    vez: z.number().int().min(1).max(20),
    inicio: hora,
    fin: hora,
  }),
]);

export type Terminar = z.infer<typeof esquemaTerminar>;

// Comprueba lo que manda la pantalla. El fin tiene que ir después del inicio.
export function leerTerminar(datos: unknown): Terminar | null {
  const r = esquemaTerminar.safeParse(datos);
  if (!r.success || r.data.fin <= r.data.inicio) return null;
  return r.data;
}
