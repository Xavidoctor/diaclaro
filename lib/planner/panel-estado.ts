import {
  TIPOS_IMPORTANTES,
  type DocumentoImportante,
} from "./documentos-importantes";

// Reglas del panel «Tu estado» (el menú que sale al deslizar a la derecha).
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

// Deslizar a la derecha abre el panel. Solo cuenta si empiezas en la mitad
// izquierda de la pantalla, para no chocar con otros gestos.
export function abreElPanel(d: Deslizamiento, anchoPantalla: number): boolean {
  return d.x1 > d.x0 && d.x0 <= anchoPantalla / 2 && esHorizontal(d);
}

// Deslizar a la izquierda (estando abierto) lo cierra.
export function cierraElPanel(d: Deslizamiento): boolean {
  return d.x1 < d.x0 && esHorizontal(d);
}

// ---- Las notas ----

export type NotaCorta = { id: string; body: string; pinned: boolean };

// Las notas que salen en el panel: primero las fijadas y luego las más
// nuevas (llegan ya ordenadas de más nueva a más antigua).
export function notasDestacadas<T extends NotaCorta>(
  notas: T[],
  cuantas: number,
): T[] {
  const fijadas = notas.filter((n) => n.pinned);
  const resto = notas.filter((n) => !n.pinned);
  return [...fijadas, ...resto].slice(0, cuantas);
}

// Una línea corta para enseñar la nota: la primera línea, sin pasar de `max`.
export function resumenNota(texto: string, max = 80): string {
  const linea = texto.trim().split("\n")[0].trim();
  if (linea.length <= max) return linea || "Nota sin texto";
  return `${linea.slice(0, max - 1).trimEnd()}…`;
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
