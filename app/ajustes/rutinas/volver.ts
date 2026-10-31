import "server-only";
import { leerProyecto } from "@/lib/data/areas";
import { prepararProyectoDeTarea } from "@/lib/planner/areas";

// De dónde entraste a crear o cambiar una rutina, para volver allí:
// ?desde=hoy (Hoy), ?desde=agenda (la Agenda) o ?proyecto=<id> (un proyecto).
// Sin nada, se vuelve a Ajustes.
export async function deDondeVienes(params: {
  desde?: string | string[];
  proyecto?: string | string[];
}): Promise<{
  volver?: string; // lo que se manda en el formulario
  href: string;
  texto: string;
  proyectoId?: string;
}> {
  if (params.desde === "hoy") return { volver: "hoy", href: "/", texto: "Hoy" };
  if (params.desde === "agenda")
    return { volver: "agenda", href: "/agenda", texto: "Agenda" };
  const id = prepararProyectoDeTarea(params.proyecto);
  const proyecto = id.ok && id.valor ? await leerProyecto(id.valor) : null;
  if (proyecto) {
    const ruta = `/areas/${proyecto.area_id}/proyectos/${proyecto.id}`;
    return {
      volver: ruta,
      href: ruta,
      texto: proyecto.name,
      proyectoId: proyecto.id,
    };
  }
  return { href: "/ajustes", texto: "Ajustes" };
}
