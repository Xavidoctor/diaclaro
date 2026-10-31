import type { ProyectoParaIA } from "@/lib/ai/interpretar-texto";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { opcionesProyecto } from "@/lib/planner/areas";

// Tus proyectos activos, con su área, para que la IA pueda sugerir uno.
// Lo usan «Tu asistente» y «Sugerir proyecto» de la Bandeja.
export async function proyectosParaIA(): Promise<ProyectoParaIA[]> {
  const { areas, proyectos } = await cargarOpcionesProyecto();
  return opcionesProyecto(areas, proyectos).flatMap((g) =>
    g.proyectos
      .filter((p) => !p.archivado)
      .map((p) => ({ id: p.id, nombre: p.name, area: g.area })),
  );
}
