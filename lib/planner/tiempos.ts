// Aprender cuánto tardas de verdad. Funciones puras, con pruebas en tiempos.test.ts.
//
// Cuando marcas una tarea como hecha, puedes decir cuánto has tardado.
// Con las tareas que tienen minutos previstos y minutos reales se calcula tu
// "factor": cuántas veces lo previsto sueles tardar. Por ejemplo, si previste
// 10 h en total y tardaste 14 h, tu factor es 1,4.
//
// Mientras haya pocas tareas el factor no se usa: con 2 o 3 ejemplos saldría
// un número poco fiable.

export const MIN_MUESTRAS = 5; // tareas necesarias antes de corregir nada
export const MAX_MUESTRAS = 30; // solo las más recientes: tu ritmo cambia

export type TipoTarea = "tarea" | "entrega";

export type TareaHecha = {
  kind: TipoTarea;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  done_at: string | null;
};

export type Factor = {
  factor: number; // 1,4 = tardas un 40 % más de lo previsto
  muestras: number; // cuántas tareas se han usado
};

// Factor de un grupo de tareas, o null si aún no hay bastantes.
export function calcularFactor(tareas: TareaHecha[]): Factor | null {
  const validas = tareas
    .filter((t) => t.done_at && t.estimated_minutes && t.actual_minutes)
    .sort((a, b) => b.done_at!.localeCompare(a.done_at!))
    .slice(0, MAX_MUESTRAS);
  if (validas.length < MIN_MUESTRAS) return null;

  const previsto = validas.reduce((s, t) => s + t.estimated_minutes!, 0);
  const real = validas.reduce((s, t) => s + t.actual_minutes!, 0);
  // Redondeado a una décima: 1,43 → 1,4.
  return {
    factor: Math.round((real / previsto) * 10) / 10,
    muestras: validas.length,
  };
}

// Un factor por tipo de tarea (las entregas suelen costar más que el resto).
// Más adelante se añadirá un factor por área o proyecto.
export function factoresPorTipo(
  tareas: TareaHecha[],
): Partial<Record<TipoTarea, Factor>> {
  const resultado: Partial<Record<TipoTarea, Factor>> = {};
  for (const tipo of ["tarea", "entrega"] as const) {
    const f = calcularFactor(tareas.filter((t) => t.kind === tipo));
    if (f) resultado[tipo] = f;
  }
  return resultado;
}

// Minutos previstos corregidos con tu factor, redondeados a 5 min.
// Sin factor, se quedan como los pusiste.
export function minutosCorregidos(
  previstos: number,
  factor: Factor | undefined,
): number {
  if (!factor) return previstos;
  return Math.max(5, Math.round((previstos * factor.factor) / 5) * 5);
}

// "1,4 veces lo previsto" o "lo previsto" si el factor es 1.
export function textoFactor(factor: Factor): string {
  if (factor.factor === 1) return "lo que prevés";
  return `${factor.factor.toLocaleString("es-ES")} veces lo que prevés`;
}

// Botones rápidos para "¿cuánto has tardado?". Si la tarea tenía minutos
// previstos, el primero es ese número.
export function opcionesMinutosReales(previstos: number | null): number[] {
  const base = [15, 30, 45, 60, 90, 120];
  if (!previstos) return base;
  return [previstos, ...base.filter((m) => m !== previstos)].slice(0, 6);
}

// Lee los minutos reales que llegan del formulario. Vacío o "no lo sé" = null.
export function leerMinutosReales(valor: unknown): number | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 1440) return null;
  return n;
}
