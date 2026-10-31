import "server-only";
import { cargarAgendaGoogle } from "@/app/componentes/agenda-google";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas } from "@/lib/data/bandeja";
import { diaDeHoy } from "@/lib/data/dia-activo";
import { leerInicio } from "@/lib/data/inicio-dia";
import { cargarProgreso } from "@/lib/data/progreso";
import { listarRutinas } from "@/lib/data/rutinas";
import { ocurrenciasEntre } from "@/lib/planner/agenda";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { bloquesDeRutinas, bloquesDeTareas } from "@/lib/planner/bloques";
import { horaEn } from "@/lib/planner/fechas";
import { juntarAgendas } from "@/lib/planner/google-calendar";
import { ajustesDelDia } from "@/lib/planner/inicio-dia";
import { organizarDia } from "@/lib/planner/organizar";
import { marcarTiempoPersonal } from "@/lib/planner/plan";
import { factoresPorTipo } from "@/lib/planner/tiempos";
import { leerUsarRitmo } from "@/lib/data/ritmo";

// Junta lo de hoy y calcula la propuesta de «Organízame el día».
// Lo ocupado: tu agenda (también Google), las rutinas con hora y las tareas
// que ya tienen hora. Se colocan las tareas de hoy (y atrasadas) sin hora.
export async function cargarOrganizar(ligero: boolean) {
  const ajustesGuardados = await leerAjustes();
  const hoy = await diaDeHoy();
  const zona = ajustesGuardados.timezone;
  const [tareas, { areas, proyectos }, eventos, rutinas, inicio, google] =
    await Promise.all([
      listarTareas(false),
      cargarOpcionesProyecto(),
      listarEventosHasta(hoy),
      listarRutinas(),
      leerInicio(hoy),
      cargarAgendaGoogle(hoy, hoy, zona),
    ]);
  // Si has pulsado «Levantado», el día cuenta desde esa hora (como en Hoy).
  const ajustes = ajustesDelDia(ajustesGuardados, inicio);
  const [excepciones, progreso, usarRitmo] = await Promise.all([
    listarExcepciones(eventos.map((e) => e.id)),
    // Para saber cuánto dormiste anoche. Si falla, no se pregunta nada.
    cargarProgreso(hoy, hoy, ajustesGuardados).catch(() => null),
    leerUsarRitmo(),
  ]);
  const pendientes = tareas.filter((t) => !t.done_at);
  const agenda = juntarAgendas(
    [
      ...ocurrenciasEntre(eventos, excepciones, hoy, hoy),
      ...bloquesDeRutinas(rutinas, hoy, hoy),
      ...bloquesDeTareas(pendientes, hoy, hoy),
    ],
    google.ocurrencias,
  );
  const { atrasadas, deHoy } = tareasParaHoy(tareas, hoy);
  const sinHora = [...atrasadas, ...deHoy].filter((t) => !t.due_time);
  const sueno = progreso?.dias.find((d) => d.fecha === hoy)?.sueno ?? null;

  const propuesta = ajustes.sleep_time
    ? organizarDia({
        tareas: marcarTiempoPersonal(sinHora, areas, proyectos),
        hoy,
        ahora: horaEn(zona),
        levantarse: ajustes.wake_time,
        acostarse: ajustes.sleep_time,
        agenda,
        factores: usarRitmo ? factoresPorTipo(tareas) : {},
        ligero,
      })
    : null; // sin hora de acostarte no se sabe cuánto día queda
  return { hoy, propuesta, sueno, quedan: sinHora.length };
}
