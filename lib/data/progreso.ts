import "server-only";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { listarHorasDormir } from "@/lib/data/dormir";
import { minutosDeFocoPorTarea } from "@/lib/data/foco";
import { horaCorta, ocurrenciasEntre } from "@/lib/planner/agenda";
import type { Ajustes } from "@/lib/planner/ajustes";
import type { HoraDormir } from "@/lib/planner/dormir";
import { horaEn, hoyEn, sumarDias } from "@/lib/planner/fechas";
import {
  calcularDia,
  minutosDeAgendaPorDia,
  minutosUsadosPorDia,
  resumirProgreso,
  type HorasDelDia,
  type MinutosDelDia,
  type SesionDelDia,
  type TareaTerminada,
} from "@/lib/planner/progreso";
import { createClient } from "@/lib/supabase/server";

// Única parte de "Tu progreso" que habla con Supabase: junta los datos y deja
// las cuentas a lib/planner/progreso.ts.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// El progreso de los días entre `desde` y `hasta` (los dos incluidos).
// Los días que aún no han llegado no salen.
export async function cargarProgreso(
  desde: string,
  hasta: string,
  ajustes: Ajustes,
) {
  const zona = ajustes.timezone;
  const hoy = hoyEn(zona);
  const ultimo = hasta > hoy ? hoy : hasta;
  const dias: string[] = [];
  for (let f = desde; f <= ultimo; f = sumarDias(f, 1)) dias.push(f);

  const [inicios, dormir, sesiones, tareas, candidaturas, rutinas, eventos] =
    await Promise.all([
      // Un día antes, para saber a qué hora te acostaste la primera noche.
      iniciosEntre(sumarDias(desde, -1), ultimo),
      // Si aún no está la tabla de "Me voy a dormir", se usa la hora prevista.
      listarHorasDormir(sumarDias(desde, -1), ultimo).catch(
        () => [] as HoraDormir[],
      ),
      sesionesEntre(desde, ultimo),
      tareasHechasCerca(desde, ultimo),
      // Si falta la tabla de candidaturas, cuentan 0.
      candidaturasEntre(desde, ultimo).catch(() => [] as MinutosDelDia[]),
      rutinasEntre(desde, ultimo),
      listarEventosHasta(ultimo),
    ]);
  const [focoTotalPorTarea, excepciones] = await Promise.all([
    minutosDeFocoPorTarea(tareas.map((t) => t.id)),
    listarExcepciones(eventos.map((e) => e.id)),
  ]);

  const usado = minutosUsadosPorDia({
    sesiones,
    tareas,
    focoTotalPorTarea,
    candidaturas,
    rutinas,
    zona,
  });
  const agenda = minutosDeAgendaPorDia(
    ocurrenciasEntre(eventos, excepciones, desde, ultimo),
  );

  // Las horas de cada día. La hora de acostarte es la real ("Me voy a
  // dormir"); si no la hay, la que pusiste ese día o, si no, la de Ajustes.
  const porFecha = new Map(inicios.map((i) => [i.on_date, i]));
  const realPorFecha = new Map(dormir.map((d) => [d.on_date, d.bed_time]));
  function horasDe(fecha: string): HorasDelDia {
    const i = porFecha.get(fecha);
    return {
      fecha,
      despierto: horaCorta(i?.awake_time ?? null),
      levantado: horaCorta(i?.start_time ?? null),
      acostarse:
        realPorFecha.get(fecha) ??
        horaCorta(i?.sleep_time ?? null) ??
        ajustes.sleep_time,
      acostarseReal: realPorFecha.has(fecha),
    };
  }
  const ahora = horaEn(zona);
  const resultado = dias.map((fecha) =>
    calcularDia({
      dia: horasDe(fecha),
      anterior: horasDe(sumarDias(fecha, -1)),
      usado: usado.get(fecha) ?? 0,
      agenda: agenda.get(fecha) ?? 0,
      ahora: fecha === hoy ? ahora : undefined,
    }),
  );
  return {
    dias: resultado,
    resumen: resumirProgreso(resultado),
    // Las horas de cada día, por si alguien quiere sacar medias (Así te conozco).
    horas: dias.map(horasDe),
  };
}

type Inicio = {
  on_date: string;
  awake_time: string | null;
  start_time: string | null;
  sleep_time: string | null;
};

async function iniciosEntre(desde: string, hasta: string): Promise<Inicio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("day_starts")
    .select("on_date, awake_time, start_time, sleep_time")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(400);
  comprobar(error, "cargar tus horas de despertar");
  return (data ?? []) as Inicio[];
}

async function sesionesEntre(
  desde: string,
  hasta: string,
): Promise<SesionDelDia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("on_date, task_id, minutes")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(2000);
  comprobar(error, "cargar las sesiones de foco");
  return (data ?? []) as SesionDelDia[];
}

// Tareas terminadas con el tiempo apuntado. Un día de margen por cada lado
// (por las zonas horarias); luego solo se pintan los días pedidos.
async function tareasHechasCerca(
  desde: string,
  hasta: string,
): Promise<TareaTerminada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, done_at, actual_minutes")
    .not("actual_minutes", "is", null)
    .gte("done_at", sumarDias(desde, -1))
    .lt("done_at", sumarDias(hasta, 2))
    .limit(2000);
  comprobar(error, "cargar las tareas hechas");
  return (data ?? []) as TareaTerminada[];
}

async function candidaturasEntre(
  desde: string,
  hasta: string,
): Promise<MinutosDelDia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_application_events")
    .select("on_date, minutes")
    .not("minutes", "is", null)
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(1000);
  comprobar(error, "cargar el tiempo de las candidaturas");
  return (data ?? []) as MinutosDelDia[];
}

// Las rutinas hechas: los minutos que apuntaste o, si no, la duración que
// pusiste en la rutina. Si no tiene ninguna de las dos, no cuenta.
async function rutinasEntre(
  desde: string,
  hasta: string,
): Promise<MinutosDelDia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_logs")
    .select("on_date, minutes, routines(duration_minutes)")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(2000);
  comprobar(error, "cargar las rutinas hechas");
  const filas = (data ?? []) as unknown as {
    on_date: string;
    minutes: number | null;
    routines: { duration_minutes: number | null } | null;
  }[];
  return filas.flatMap((r) => {
    const minutos = r.minutes ?? r.routines?.duration_minutes ?? null;
    return minutos ? [{ on_date: r.on_date, minutes: minutos }] : [];
  });
}
