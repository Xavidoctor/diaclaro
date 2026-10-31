// Los colores de las áreas. Pocos, para que se distingan bien en la Agenda.
// Lo que no tiene área (o su área no tiene color) sale en verde oscuro.
// Funciones puras, con pruebas en colores.test.ts.

export const COLORES_AREA = [
  { clave: "azul", nombre: "Azul", hex: "#5b8def" },
  { clave: "morado", nombre: "Morado", hex: "#9b7be0" },
  { clave: "rosa", nombre: "Rosa", hex: "#e07bb0" },
  { clave: "naranja", nombre: "Naranja", hex: "#e8925a" },
  { clave: "amarillo", nombre: "Amarillo", hex: "#d4b23f" },
  { clave: "gris", nombre: "Gris", hex: "#8a949c" },
] as const;

export type ColorArea = (typeof COLORES_AREA)[number]["clave"];

// El verde oscuro de lo que no tiene color.
export const VERDE_OSCURO = "#3f8f68";

// Lo que llega del formulario: una clave de la lista, o vacío (sin color).
export function leerColor(valor: unknown): ColorArea | null {
  return COLORES_AREA.find((c) => c.clave === valor)?.clave ?? null;
}

export function hexDeColor(color: string | null | undefined): string {
  return COLORES_AREA.find((c) => c.clave === color)?.hex ?? VERDE_OSCURO;
}

// El color de una tarea o rutina: el de su área (por su proyecto).
export function colorDeProyecto(
  proyectoId: string | null | undefined,
  proyectos: { id: string; area_id: string }[],
  areas: { id: string; color?: string | null }[],
): string {
  const areaId = proyectos.find((p) => p.id === proyectoId)?.area_id;
  return hexDeColor(areas.find((a) => a.id === areaId)?.color);
}
