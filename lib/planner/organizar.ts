import type { Ocurrencia } from "./agenda";
import { aMinutos } from "./carga";
import { NUM_PRIORIDADES, ordenarTareas, type TareaParaPlan } from "./plan";
import { minutosCorregidos, type Factor, type TipoTarea } from "./tiempos";

// «Organízame el día»: coloca tus tareas más importantes de hoy en los huecos
// libres que te quedan, entre la agenda y las rutinas con hora.
// Funciones puras, con pruebas en organizar.test.ts. Sin IA.
//
// Reglas (de lo que funciona en otras apps):
// - Solo la principal y 2 más (o solo la principal si pides un día ligero).
// - Nunca llena el día: como mucho el 70 % del tiempo libre, y 10 minutos de
//   respiro entre bloques.
// - Usa lo que sueles tardar de verdad (tu factor), pero nunca se inventa una
//   duración: las tareas sin minutos se quedan fuera y te lo dice.
// - Solo propone. Nada cambia hasta que pulsas «Aceptar el plan».

export const DESCANSO = 10; // minutos entre un bloque y el siguiente
export const MAX_OCUPACION = 0.7; // parte del tiempo libre que se puede planificar
const PASO = 5; // los bloques empiezan en múltiplos de 5 minutos
const DIA = 24 * 60;

export type Hueco = { inicio: number; fin: number }; // minutos desde las 00:00

export type BloquePropuesto<T> = {
  tarea: T;
  inicio: string; // "10:30"
  fin: string; // "11:15"
  minutos: number; // los que se reservan (con tu factor)
  previstos: number; // los que pusiste tú
};

export type DiaOrganizado<T> = {
  bloques: BloquePropuesto<T>[];
  sinMinutos: T[]; // no se pueden colocar sin saber cuánto duran
  noCaben: T[]; // no caben en los huecos o llenarían demasiado el día
  sinFin: string[]; // compromisos sin hora de fin (se tratan como un punto)
  libres: number; // minutos libres que quedan hoy
};

export function aHora(minutos: number): string {
  const m = ((minutos % DIA) + DIA) % DIA;
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
}

// Los ratos libres entre ahora (o tu hora de levantarte) y la de acostarte,
// quitando lo ocupado. Si te acuestas pasada la medianoche, el día se alarga
// (la 01:00 cuenta como 25:00). Lo ocupado sin hora de fin corta el hueco
// en ese punto, para no colocar nada encima de su inicio.
export function huecosLibres(d: {
  ahora: string;
  levantarse: string | null;
  acostarse: string;
  ocupado: { inicio: string; fin: string | null }[];
}): Hueco[] {
  const levantarse = d.levantarse ? aMinutos(d.levantarse) : 0;
  let acostarse = aMinutos(d.acostarse);
  let ahora = aMinutos(d.ahora);
  if (acostarse <= (d.levantarse ? levantarse : ahora)) acostarse += DIA;
  if (ahora < levantarse && ahora + DIA < acostarse) ahora += DIA;
  const desde = Math.ceil(Math.max(ahora, levantarse) / PASO) * PASO;
  if (desde >= acostarse) return [];

  // Lo ocupado, en el mismo eje (lo de madrugada va después de medianoche).
  const enEje = (hora: string) => {
    const m = aMinutos(hora);
    return acostarse > DIA && m < levantarse ? m + DIA : m;
  };
  const tramos = d.ocupado
    .map((o) => {
      const inicio = enEje(o.inicio);
      let fin = o.fin ? enEje(o.fin) : inicio;
      if (fin < inicio) fin += DIA;
      return { inicio, fin: fin + (o.fin ? DESCANSO : 0) };
    })
    .sort((a, b) => a.inicio - b.inicio);

  const huecos: Hueco[] = [];
  let cursor = desde;
  for (const t of tramos) {
    if (t.fin <= cursor) continue;
    if (t.inicio > cursor) huecos.push({ inicio: cursor, fin: t.inicio });
    cursor = Math.max(cursor, Math.ceil(t.fin / PASO) * PASO);
    if (cursor >= acostarse) break;
  }
  if (cursor < acostarse) huecos.push({ inicio: cursor, fin: acostarse });
  return huecos
    .map((h) => ({ inicio: h.inicio, fin: Math.min(h.fin, acostarse) }))
    .filter((h) => h.fin > h.inicio);
}

// Lo ocupado de hoy: agenda (sin lo que en Google marcaste como «Disponible»),
// rutinas y tareas con hora. Lo que no tiene hora de inicio no ocupa un rato.
export function ocupadoDeHoy(agenda: Ocurrencia[]) {
  return agenda
    .filter((o) => o.horaInicio && !o.google?.libre)
    .map((o) => ({ titulo: o.titulo, inicio: o.horaInicio!, fin: o.horaFin }));
}

export function organizarDia<T extends TareaParaPlan>(d: {
  tareas: T[]; // las de hoy y las atrasadas, sin hora
  hoy: string;
  ahora: string;
  levantarse: string | null;
  acostarse: string;
  agenda: Ocurrencia[];
  factores: Partial<Record<TipoTarea, Factor>>;
  ligero?: boolean; // día ligero: solo la principal
}): DiaOrganizado<T> {
  const ocupado = ocupadoDeHoy(d.agenda);
  const huecos = huecosLibres({
    ahora: d.ahora,
    levantarse: d.levantarse,
    acostarse: d.acostarse,
    ocupado,
  });
  const libres = huecos.reduce((s, h) => s + (h.fin - h.inicio), 0);
  const cuantas = d.ligero ? 1 : NUM_PRIORIDADES;
  const elegidas = ordenarTareas(d.tareas, d.hoy).slice(0, cuantas);

  const colocados: { desde: number; bloque: BloquePropuesto<T> }[] = [];
  const sinMinutos: T[] = [];
  const noCaben: T[] = [];
  let planificado = 0;
  for (const tarea of elegidas) {
    if (!tarea.estimated_minutes) {
      sinMinutos.push(tarea);
      continue;
    }
    const minutos = minutosCorregidos(
      tarea.estimated_minutes,
      d.factores[tarea.kind],
    );
    const hueco = huecos.find((h) => h.fin - h.inicio >= minutos);
    if (!hueco || planificado + minutos > libres * MAX_OCUPACION) {
      noCaben.push(tarea);
      continue;
    }
    colocados.push({
      desde: hueco.inicio,
      bloque: {
        tarea,
        inicio: aHora(hueco.inicio),
        fin: aHora(hueco.inicio + minutos),
        minutos,
        previstos: tarea.estimated_minutes,
      },
    });
    planificado += minutos;
    hueco.inicio = Math.ceil((hueco.inicio + minutos + DESCANSO) / PASO) * PASO;
  }
  // En orden de hora (con la madrugada después de la noche).
  const bloques = colocados
    .sort((a, b) => a.desde - b.desde)
    .map((c) => c.bloque);

  return {
    bloques,
    sinMinutos,
    noCaben,
    sinFin: ocupado.filter((o) => !o.fin).map((o) => o.titulo),
    libres,
  };
}

// ¿Anoche dormiste poco? Por debajo de 6 horas se ofrece un día ligero.
export const POCO_SUENO = 6 * 60;
export function durmioPoco(minutos: number | null): boolean {
  return minutos !== null && minutos < POCO_SUENO;
}

// ---- Aceptar el plan ----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Lee los bloques que viajan en el botón: "id|10:30". Lo que no cuadra se
// ignora (el formulario se puede tocar).
export function leerBloquesAceptados(
  valores: unknown[],
): { id: string; hora: string }[] {
  return valores.slice(0, 10).flatMap((v) => {
    if (typeof v !== "string") return [];
    const [id, hora] = v.split("|");
    return id && UUID.test(id) && hora && HORA.test(hora) ? [{ id, hora }] : [];
  });
}
