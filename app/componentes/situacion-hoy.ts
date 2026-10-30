import "server-only";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerInicio } from "@/lib/data/inicio-dia";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas, type Tarea } from "@/lib/data/bandeja";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import { ocurrenciasEntre, type Ocurrencia } from "@/lib/planner/agenda";
import type { Ajustes } from "@/lib/planner/ajustes";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { calcularCarga } from "@/lib/planner/carga";
import { hoyEn, horaEn } from "@/lib/planner/fechas";
import { ajustesDelDia } from "@/lib/planner/inicio-dia";
import { proponerRecortes } from "@/lib/planner/recortes";
import { rutinasDelDia, type RutinaDelDia } from "@/lib/planner/rutinas";
import { factoresPorTipo } from "@/lib/planner/tiempos";

// Junta los datos de hoy y calcula si te pasas y qué se podría recortar.
// La usan la tarjeta de Hoy y el botón de la IA, para que los dos vean lo mismo.

export async function calcularSituacion({
  hoy,
  ajustes,
  agenda,
  rutinas,
}: {
  hoy: string;
  ajustes: Ajustes;
  agenda: Ocurrencia[];
  rutinas: RutinaDelDia[];
}) {
  const tareas = await listarTareas(false);
  const { atrasadas, deHoy } = tareasParaHoy(tareas, hoy);
  const tareasHoy = [...atrasadas, ...deHoy];
  // Lo que sueles tardar de verdad, aprendido de tus tareas hechas.
  const factores = factoresPorTipo(tareas);
  const carga = calcularCarga({
    ahora: horaEn(ajustes.timezone),
    horaLevantarse: ajustes.wake_time,
    horaAcostarse: ajustes.sleep_time,
    tareas: tareasHoy,
    agenda,
    rutinas,
    factores,
  });
  const propuesta =
    carga.estado === "te-pasas"
      ? proponerRecortes(
          await recortables(tareasHoy),
          -carga.diferencia,
          hoy,
          factores,
        )
      : null;
  return { carga, factores, propuesta, tareasHoy };
}

// Lo mismo, cargando antes la agenda y las rutinas de hoy (para el botón de la IA).
export async function cargarSituacion() {
  const ajustesGuardados = await leerAjustes();
  const hoy = hoyEn(ajustesGuardados.timezone);
  const [eventos, rutinas, registros, inicio] = await Promise.all([
    listarEventosHasta(hoy),
    listarRutinas(),
    listarRegistrosDelDia(hoy),
    leerInicio(hoy),
  ]);
  // Si has pulsado "Empiezo el día", el día cuenta desde esa hora (como en Hoy).
  const ajustes = ajustesDelDia(ajustesGuardados, inicio);
  const excepciones = await listarExcepciones(eventos.map((e) => e.id));
  const situacion = await calcularSituacion({
    hoy,
    ajustes,
    agenda: ocurrenciasEntre(eventos, excepciones, hoy, hoy),
    rutinas: rutinasDelDia(rutinas, registros, hoy),
  });
  return { ...situacion, ajustes, hoy };
}

// Las tareas de hoy con lo que hace falta para decidir qué recortar:
// si su proyecto es de un área de tiempo personal (un hobby).
async function recortables(tareas: Tarea[]) {
  const { areas, proyectos } = await cargarOpcionesProyecto();
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
