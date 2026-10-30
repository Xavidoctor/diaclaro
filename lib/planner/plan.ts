import type { Importancia } from "./recortes";
import type { TipoTarea } from "./tiempos";

// El plan del día sin IA. Funciones puras, con pruebas en plan.test.ts.
//
// Ordena las tareas de hoy (y las atrasadas) de la más urgente a la menos,
// y de ahí salen tus 3 prioridades y la siguiente tarea que te toca.
// Solo usa lo que tú has puesto en cada tarea: fecha, fecha dura,
// importancia, tipo y área. No se inventa horas ni duraciones.

export type TareaParaPlan = {
  id: string;
  title: string;
  kind: TipoTarea;
  due_date: string | null;
  estimated_minutes: number | null;
  importance: Importancia | null; // null = sin indicar
  hard_deadline: boolean;
  created_at: string;
  tiempoPersonal: boolean; // su proyecto es de un área de tiempo personal
};

export const NUM_PRIORIDADES = 3;

// Nivel de urgencia: cuanto más bajo, antes va.
//   0. Fecha dura que vence hoy o ya ha pasado: no se puede mover.
//   1. Importancia alta.
//   2. Importancia normal o sin indicar.
//   3. Importancia baja.
//   4. Tiempo personal (un hobby): nunca pasa delante de lo demás.
// La fecha dura y la importancia alta ganan aunque sea tiempo personal.
export function nivel(t: TareaParaPlan, hoy: string): number {
  if (t.hard_deadline && t.due_date && t.due_date <= hoy) return 0;
  if (t.importance === "alta") return 1;
  if (t.tiempoPersonal) return 4;
  if (t.importance === "baja") return 3;
  return 2;
}

// Ordena de la más urgente a la menos. Con el mismo nivel:
//   - primero la que vence antes (las atrasadas, delante),
//   - luego las entregas antes que las tareas normales,
//   - y si aún empatan, la que apuntaste antes.
export function ordenarTareas<T extends TareaParaPlan>(
  tareas: T[],
  hoy: string,
): T[] {
  return [...tareas].sort((a, b) => {
    const porNivel = nivel(a, hoy) - nivel(b, hoy);
    if (porNivel !== 0) return porNivel;
    // Sin fecha va al final de su nivel ("9999" es más tarde que cualquier fecha).
    const porFecha = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    if (porFecha !== 0) return porFecha;
    if (a.kind !== b.kind) return a.kind === "entrega" ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

// Por qué una tarea está donde está, para enseñarlo debajo del título.
export function motivoOrden(t: TareaParaPlan, hoy: string): string {
  switch (nivel(t, hoy)) {
    case 0:
      return t.due_date! < hoy
        ? "Fecha que no se puede mover, y ya ha pasado"
        : "Fecha que no se puede mover";
    case 1:
      return "Importancia alta";
    case 3:
      return "Importancia baja";
    case 4:
      return "Tiempo personal";
    default:
      if (t.due_date && t.due_date < hoy) return "Atrasada";
      return t.kind === "entrega" ? "Entrega para hoy" : "Para hoy";
  }
}

export type PlanDelDia<T> = {
  prioridades: T[]; // las 3 primeras (o menos, si no hay tantas)
  resto: T[]; // las demás, en orden
  siguiente: T | null; // la primera de todas: por donde empezar
};

// El plan: tus 3 prioridades, lo demás en orden y la siguiente tarea.
export function planDelDia<T extends TareaParaPlan>(
  tareas: T[],
  hoy: string,
): PlanDelDia<T> {
  const ordenadas = ordenarTareas(tareas, hoy);
  return {
    prioridades: ordenadas.slice(0, NUM_PRIORIDADES),
    resto: ordenadas.slice(NUM_PRIORIDADES),
    siguiente: ordenadas[0] ?? null,
  };
}

// Añade a cada tarea si es de tiempo personal: lo es cuando su proyecto
// pertenece a un área marcada como "tiempo personal" (un hobby).
export function marcarTiempoPersonal<T extends { project_id: string | null }>(
  tareas: T[],
  areas: { id: string; personal_time: boolean }[],
  proyectos: { id: string; area_id: string }[],
): (T & { tiempoPersonal: boolean })[] {
  const personales = new Set(
    areas.filter((a) => a.personal_time).map((a) => a.id),
  );
  const proyectosPersonales = new Set(
    proyectos.filter((p) => personales.has(p.area_id)).map((p) => p.id),
  );
  return tareas.map((t) => ({
    ...t,
    tiempoPersonal: Boolean(
      t.project_id && proyectosPersonales.has(t.project_id),
    ),
  }));
}
