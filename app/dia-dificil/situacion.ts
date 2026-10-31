import "server-only";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas } from "@/lib/data/bandeja";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import { ocurrenciasEntre } from "@/lib/planner/agenda";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { proponerDiaDificil, type Motivo } from "@/lib/planner/dia-dificil";
import { marcarTiempoPersonal } from "@/lib/planner/plan";
import { rutinasDelDia } from "@/lib/planner/rutinas";
import { factoresPorTipo } from "@/lib/planner/tiempos";
import { leerUsarRitmo } from "@/lib/data/ritmo";
import { diaDeHoy } from "@/lib/data/dia-activo";

// Junta todo lo de hoy y calcula la propuesta del Día difícil.
// Lo usan la página y el botón «Explícamelo con IA», para que los dos vean
// exactamente lo mismo.
export async function cargarDiaDificil(motivo: Motivo) {
  const hoy = await diaDeHoy();
  const [tareas, { areas, proyectos }, eventos, rutinas, registros] =
    await Promise.all([
      listarTareas(false),
      cargarOpcionesProyecto(),
      listarEventosHasta(hoy),
      listarRutinas(),
      listarRegistrosDelDia(hoy),
    ]);
  const excepciones = await listarExcepciones(eventos.map((e) => e.id));
  const agenda = ocurrenciasEntre(eventos, excepciones, hoy, hoy);
  const pendientes = rutinasDelDia(rutinas, registros, hoy).filter(
    (r) => !r.completa,
  );
  const { atrasadas, deHoy } = tareasParaHoy(tareas, hoy);
  const propuesta = proponerDiaDificil(
    marcarTiempoPersonal([...atrasadas, ...deHoy], areas, proyectos),
    hoy,
    motivo,
    // Lo que sueles tardar de verdad, si no lo has apagado en «Así te conozco».
    (await leerUsarRitmo()) ? factoresPorTipo(tareas) : {},
  );
  return { hoy, agenda, pendientes, propuesta };
}
