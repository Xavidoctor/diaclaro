import { textoHoras, type Area } from "./areas";

// Resumen de la semana por áreas. Funciones puras, con pruebas en
// resumen-semana.test.ts.
//
// Para cada área suma el tiempo que le has dado de lunes a domingo y lo
// compara con su presupuesto (las horas a la semana que te propusiste).
// El tiempo sale de tres sitios:
//   1. Foco: las sesiones del temporizador en tareas de un proyecto del área.
//   2. Tareas: lo que contestaste en «¿Cuánto has tardado?» al terminar una
//      tarea esta semana. Si ya lo habías medido con el temporizador, solo se
//      suma lo que falte, para no contar el mismo rato dos veces.
//   3. Candidaturas: los minutos apuntados en su historial.
// Nunca se inventa tiempo: si no lo has apuntado, no cuenta.

export type ProyectoDeArea = { id: string; area_id: string };

// Una sesión del temporizador de la semana, con el proyecto de su tarea.
export type SesionSemana = {
  task_id: string | null;
  project_id: string | null;
  minutes: number;
};

// Una tarea terminada, con el tiempo que dijiste que tardaste.
export type TareaHecha = {
  id: string;
  project_id: string | null;
  done_at: string; // fecha y hora, como la guarda Supabase
  actual_minutes: number;
};

export type EstadoArea =
  | "sin-presupuesto" // no tiene horas fijadas
  | "pendiente" // aún no has llegado
  | "cumplido" // has llegado (o te has pasado un poco)
  | "pasado"; // tiempo personal: has pasado el tope que te pusiste

export type FilaArea = {
  area: Pick<Area, "id" | "name" | "weekly_minutes" | "personal_time">;
  foco: number;
  tareas: number;
  candidaturas: number;
  total: number;
  estado: EstadoArea;
};

export type ResumenSemana = {
  filas: FilaArea[];
  sinArea: number; // tiempo medido que no está en ningún área
  total: number; // todo lo medido, con o sin área
};

// El día (como "2026-10-30") en que pasó un momento, en tu zona horaria.
// Ejemplo: "2026-10-29T23:30:00Z" en Madrid ya es el 30.
export function diaEn(momento: string, zona: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(momento));
}

function sumar(mapa: Map<string, number>, clave: string, minutos: number) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + minutos);
}

export function calcularResumen(datos: {
  areas: Area[];
  proyectos: ProyectoDeArea[];
  sesiones: SesionSemana[];
  tareas: TareaHecha[];
  focoTotalPorTarea: Record<string, number>; // todo el foco de cada tarea
  candidaturas: Map<string, number>; // minutos por área
  desde: string; // lunes
  hasta: string; // domingo
  zona: string;
}): ResumenSemana {
  const areaDe = new Map(datos.proyectos.map((p) => [p.id, p.area_id]));
  const foco = new Map<string, number>();
  const tareas = new Map<string, number>();
  let sinArea = 0;

  for (const s of datos.sesiones) {
    const area = s.project_id ? areaDe.get(s.project_id) : undefined;
    if (area) sumar(foco, area, s.minutes);
    else sinArea += s.minutes;
  }

  for (const t of datos.tareas) {
    const dia = diaEn(t.done_at, datos.zona);
    if (dia < datos.desde || dia > datos.hasta) continue;
    // Solo lo que no estaba ya medido con el temporizador.
    const extra = Math.max(
      0,
      t.actual_minutes - (datos.focoTotalPorTarea[t.id] ?? 0),
    );
    if (extra === 0) continue;
    const area = t.project_id ? areaDe.get(t.project_id) : undefined;
    if (area) sumar(tareas, area, extra);
    else sinArea += extra;
  }

  // Candidaturas de un área que ya no existe: cuentan como sin área.
  const ids = new Set(datos.areas.map((a) => a.id));
  for (const [area, minutos] of datos.candidaturas)
    if (!ids.has(area)) sinArea += minutos;

  const filas: FilaArea[] = [];
  for (const area of datos.areas) {
    const f = foco.get(area.id) ?? 0;
    const t = tareas.get(area.id) ?? 0;
    const c = datos.candidaturas.get(area.id) ?? 0;
    const total = f + t + c;
    // Las áreas archivadas solo salen si tienen tiempo esta semana.
    if (area.archived_at && total === 0) continue;
    filas.push({
      area: {
        id: area.id,
        name: area.name,
        weekly_minutes: area.weekly_minutes,
        personal_time: area.personal_time,
      },
      foco: f,
      tareas: t,
      candidaturas: c,
      total,
      estado: estadoDe(area, total),
    });
  }

  return {
    filas,
    sinArea,
    total: filas.reduce((s, f) => s + f.total, 0) + sinArea,
  };
}

function estadoDe(
  area: Pick<Area, "weekly_minutes" | "personal_time">,
  total: number,
): EstadoArea {
  const presupuesto = area.weekly_minutes;
  if (!presupuesto) return "sin-presupuesto";
  if (area.personal_time) return total > presupuesto ? "pasado" : "pendiente";
  return total >= presupuesto ? "cumplido" : "pendiente";
}

// Cuánto de la barra hay que pintar (de 0 a 100). Sin presupuesto, nada.
export function porcentaje(total: number, presupuesto: number | null): number {
  if (!presupuesto) return 0;
  return Math.min(100, Math.round((total / presupuesto) * 100));
}

// La frase debajo del nombre del área.
export function textoFila(fila: FilaArea): string {
  const { total } = fila;
  const presupuesto = fila.area.weekly_minutes;
  const llevas = total > 0 ? textoHoras(total) : "0 min";
  switch (fila.estado) {
    case "sin-presupuesto":
      return total > 0
        ? `${llevas} esta semana (sin horas fijadas)`
        : "Nada apuntado (sin horas fijadas)";
    case "pasado":
      return `${llevas} de un tope de ${textoHoras(presupuesto!)}: te has pasado ${textoHoras(total - presupuesto!)}`;
    case "cumplido":
      return total > presupuesto!
        ? `${llevas} de ${textoHoras(presupuesto!)}: hecho, y ${textoHoras(total - presupuesto!)} de más`
        : `${llevas} de ${textoHoras(presupuesto!)}: hecho`;
    case "pendiente":
      return fila.area.personal_time
        ? `${llevas} de un tope de ${textoHoras(presupuesto!)}`
        : `${llevas} de ${textoHoras(presupuesto!)}: faltan ${textoHoras(presupuesto! - total)}`;
  }
}

// De dónde sale el tiempo: "Foco 1 h · Tareas 20 min · Candidaturas 45 min".
// Solo nombra lo que tiene minutos.
export function textoDesglose(
  fila: Pick<FilaArea, "foco" | "tareas" | "candidaturas">,
): string | null {
  const partes = [
    ["Foco", fila.foco],
    ["Tareas", fila.tareas],
    ["Candidaturas", fila.candidaturas],
  ] as const;
  const texto = partes
    .filter(([, m]) => m > 0)
    .map(([nombre, m]) => `${nombre} ${textoHoras(m)}`)
    .join(" · ");
  return texto || null;
}
