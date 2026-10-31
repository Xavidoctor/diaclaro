import type { Area, Proyecto } from "./areas";

// El resumen de los días siguientes en la Agenda: en vez de la lista de
// cosas, de qué va ese día («Día de estudio y dropshipping»), según las
// áreas de sus tareas y rutinas. Funciones puras, con pruebas.

// Las áreas de esos proyectos, sin repetir y en tu orden de áreas.
// Lo que no tiene proyecto no cuenta.
export function areasDelDia(
  proyectoIds: (string | null | undefined)[],
  proyectos: Pick<Proyecto, "id" | "area_id">[],
  areas: Pick<Area, "id" | "name" | "position">[],
): string[] {
  const areaDe = new Map(proyectos.map((p) => [p.id, p.area_id]));
  const ids = new Set(
    proyectoIds.flatMap((id) =>
      id && areaDe.has(id) ? [areaDe.get(id)!] : [],
    ),
  );
  return areas
    .filter((a) => ids.has(a.id))
    .sort((a, b) => a.position - b.position)
    .map((a) => a.name);
}

// ["Estudio"] → "Día de Estudio"; ["Ejercicio", "Estudio", "Dropshipping"]
// → "Día de Ejercicio, Estudio y Dropshipping". Sin áreas → null.
export function textoDiaDe(nombres: string[]): string | null {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return `Día de ${nombres[0]}`;
  return `Día de ${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}
