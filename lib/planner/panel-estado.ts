import {
  textoFechaLimite,
  textoPendienteDesde,
  tareasParaHoy,
  type TipoFecha,
} from "./bandeja";
import {
  TIPOS_IMPORTANTES,
  type DocumentoImportante,
} from "./documentos-importantes";
import { fechaCorta, sumarDias } from "./fechas";
import {
  filasDeHoy,
  rutinasDelDia,
  type RegistroRutina,
  type Rutina,
} from "./rutinas";

// Reglas del panel «Tu estado» (el menú que sale al deslizar el dedo
// de derecha a izquierda).
// Funciones puras, con pruebas en panel-estado.test.ts.

// ---- El gesto ----

// Un dedo que se ha movido de (x0, y0) a (x1, y1), en píxeles.
export type Deslizamiento = { x0: number; y0: number; x1: number; y1: number };

// Cuánto hay que mover el dedo para que cuente (unos 2 cm en el móvil).
export const DISTANCIA_MINIMA = 70;

// Es "hacia un lado" si se mueve mucho más en horizontal que en vertical.
// Así, al bajar por la pantalla con un poco de torcedura, no se abre nada.
function esHorizontal(d: Deslizamiento): boolean {
  const dx = Math.abs(d.x1 - d.x0);
  const dy = Math.abs(d.y1 - d.y0);
  return dx >= DISTANCIA_MINIMA && dy <= dx / 2;
}

// Deslizar de derecha a izquierda abre el panel. Solo cuenta si empiezas en
// la mitad derecha de la pantalla, para no chocar con otros gestos.
export function abreElPanel(d: Deslizamiento, anchoPantalla: number): boolean {
  return d.x1 < d.x0 && d.x0 >= anchoPantalla / 2 && esHorizontal(d);
}

// Deslizar de izquierda a derecha (estando abierto) lo cierra.
export function cierraElPanel(d: Deslizamiento): boolean {
  return d.x1 > d.x0 && esHorizontal(d);
}

// ---- Las notas ----

export type NotaCorta = { id: string; body: string; pinned: boolean };

// Las notas que salen en el panel: solo las fijadas, de la más nueva a la
// más antigua (llegan ya en ese orden).
export function notasFijadas<T extends NotaCorta>(
  notas: T[],
  cuantas: number,
): T[] {
  return notas.filter((n) => n.pinned).slice(0, cuantas);
}

// Una línea corta para enseñar la nota: la primera línea, sin pasar de `max`.
export function resumenNota(texto: string, max = 80): string {
  const linea = texto.trim().split("\n")[0].trim();
  if (linea.length <= max) return linea || "Nota sin texto";
  return `${linea.slice(0, max - 1).trimEnd()}…`;
}

// ---- Por hacer ----

type TareaPendiente = {
  due_date: string | null;
  due_time?: string | null;
  due_kind?: TipoFecha;
  done_at: string | null;
  created_at: string;
};

// Lo que tienes por hacer, en una lista: primero lo que se quedó atrás,
// luego lo de hoy, lo que tienes en marcha (con fecha límite), lo de los
// próximos días y, al final, lo que no tiene día.
export function tareasPorHacer<T extends TareaPendiente>(
  tareas: T[],
  hoy: string,
  cuantas: number,
): { lista: T[]; mas: number; sinDia: number } {
  const { atrasadas, deHoy, enMarcha, proximas, sinDia } = tareasParaHoy(
    tareas,
    hoy,
    6,
  );
  const todas = [...atrasadas, ...deHoy, ...enMarcha, ...proximas, ...sinDia];
  return {
    lista: todas.slice(0, cuantas),
    mas: Math.max(0, todas.length - cuantas),
    sinDia: sinDia.length,
  };
}

// Las rutinas que tocan hoy, una fila por cada vez: primero lo que queda y
// al final lo ya hecho (se ve tachado). "vez" solo si se hace varias veces.
export type RutinaPorHacer = {
  id: string;
  titulo: string;
  vez: number | null;
  hora: string | null;
  hecha: boolean;
};

export function rutinasPorHacer(
  rutinas: Rutina[],
  registros: RegistroRutina[],
  hoy: string,
  cuantas: number,
): RutinaPorHacer[] {
  return filasDeHoy(rutinasDelDia(rutinas, registros, hoy))
    .slice(0, cuantas)
    .map((f) => ({
      id: f.item.rutina.id,
      titulo: f.item.rutina.title,
      vez: f.vez?.numero ?? null,
      hora: f.vez?.hora ?? f.item.rutina.window_start,
      hecha: f.hecha,
    }));
}

// Cuándo toca una tarea, sea del tipo que sea: "Hoy", "Hasta el 6 nov ·
// quedan 5 días" o "Cuando puedas" (sin día).
export function cuandoTocaTarea(t: TareaPendiente, hoy: string): string {
  if (!t.due_date) return "Cuando puedas";
  if (t.due_kind === "limite" && t.due_date >= hoy)
    return textoFechaLimite(t.due_date, hoy);
  return cuandoToca(t.due_date, hoy);
}

// Cuándo toca: "Hoy", "Mañana", "De ayer", "De hace 3 días" o "12 nov.".
export function cuandoToca(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha < hoy) {
    const texto = textoPendienteDesde(fecha, hoy);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  return fechaCorta(fecha);
}

// ---- El carpetero de documentos ----

// Ordena los documentos como en una cartera: primero el DNI, luego viajes,
// entradas, salud y otros. Dentro de cada tipo, el más nuevo primero.
export function ordenarCartera(
  documentos: DocumentoImportante[],
): DocumentoImportante[] {
  const orden = (d: DocumentoImportante) =>
    TIPOS_IMPORTANTES.findIndex((t) => t.id === d.tipo);
  return [...documentos].sort(
    (a, b) => orden(a) - orden(b) || b.creado.localeCompare(a.creado),
  );
}
