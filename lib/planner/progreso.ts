import { aMinutos } from "./carga";
import { diaEn } from "./resumen-semana";

// Tu progreso: cómo se reparten las horas de cada día. Funciones puras, con
// pruebas en progreso.test.ts.
//
// Para cada día calcula:
//   - Sueño: desde que te acostaste la noche anterior hasta que pulsaste
//     "Despierto" (o "Levantado", si solo pulsaste ese).
//   - En la cama: el rato entre "Despierto" y "Levantado".
//   - En pie: desde "Levantado" hasta tu hora de acostarte (hoy, hasta ahora).
//   - Usado: el tiempo que has apuntado (foco, tareas, candidaturas, rutinas).
//   - Agenda: lo que tenías en la agenda con hora de inicio y de fin.
//   - Sin apuntar ("horas muertas"): lo que queda de "en pie" sin nada apuntado.
//
// Nunca se inventa una hora: si falta un dato, ese número se queda vacío.
// De momento la hora de acostarte es la que pusiste (la de ese día o la de
// Ajustes), no la real, así que el sueño es aproximado.

const DIA = 24 * 60;

// Las horas de despertar y acostarte de un día (todas pueden faltar).
export type HorasDelDia = {
  fecha: string; // "2026-10-30"
  despierto: string | null; // "9:50", botón "Despierto"
  levantado: string | null; // "10:12", botón "Levantado"
  acostarse: string | null; // "23:30" o "01:00": hora de acostarte de ese día
};

// Lo que has apuntado, con el día en que pasó.
export type SesionDelDia = {
  on_date: string;
  task_id: string | null;
  minutes: number;
};
export type TareaTerminada = {
  id: string;
  done_at: string; // fecha y hora, como la guarda Supabase
  actual_minutes: number;
};
export type MinutosDelDia = { on_date: string; minutes: number };

export type DiaProgreso = {
  fecha: string;
  sueno: number | null;
  enCama: number | null;
  enPie: number | null;
  usado: number;
  agenda: number;
  sinApuntar: number | null;
  esHoy: boolean; // si es hoy, "en pie" llega solo hasta ahora
};

// ---- Horas ----

// Minutos dormidos entre la hora de acostarte de la noche anterior y la hora
// de despertarte. Una hora de acostarte de tarde-noche (desde las 12:00) es
// del día anterior; una de madrugada (antes de las 12:00) ya es del día nuevo.
// null si falta algo o si sale algo sin sentido (más de 16 h).
export function minutosDeSueno(
  acostarseAnoche: string | null,
  despertar: string | null,
): number | null {
  if (!acostarseAnoche || !despertar) return null;
  const acostarse = aMinutos(acostarseAnoche);
  const desde = acostarse >= 12 * 60 ? acostarse - DIA : acostarse;
  const minutos = aMinutos(despertar) - desde;
  return minutos > 0 && minutos <= 16 * 60 ? minutos : null;
}

// Minutos entre "Despierto" y "Levantado".
export function minutosEnCama(
  despierto: string | null,
  levantado: string | null,
): number | null {
  if (!despierto || !levantado) return null;
  const minutos = aMinutos(levantado) - aMinutos(despierto);
  return minutos >= 0 ? minutos : null;
}

// Minutos en pie: desde que te levantas hasta que te acuestas. Si te acuestas
// después de medianoche, cuenta como hora del día siguiente. Si es hoy, se
// cuenta solo hasta ahora ("ahora" puede ser pasada la medianoche).
export function minutosEnPie(
  levantado: string | null,
  acostarse: string | null,
  ahora?: string,
): number | null {
  if (!levantado || !acostarse) return null;
  const inicio = aMinutos(levantado);
  let fin = aMinutos(acostarse);
  if (fin <= inicio) fin += DIA;
  if (ahora !== undefined) {
    let actual = aMinutos(ahora);
    if (actual < inicio) actual += DIA;
    fin = Math.min(fin, actual);
  }
  return Math.max(0, fin - inicio);
}

// ---- Tiempo apuntado por día ----

function sumar(mapa: Map<string, number>, dia: string, minutos: number) {
  mapa.set(dia, (mapa.get(dia) ?? 0) + minutos);
}

// Todo lo que has apuntado cada día: foco, tareas (sin repetir lo que ya
// mediste con el temporizador, como en el resumen semanal), candidaturas y
// rutinas. Devuelve un Map: día → minutos.
export function minutosUsadosPorDia(datos: {
  sesiones: SesionDelDia[];
  tareas: TareaTerminada[];
  focoTotalPorTarea: Record<string, number>;
  candidaturas: MinutosDelDia[];
  rutinas: MinutosDelDia[];
  zona: string;
}): Map<string, number> {
  const porDia = new Map<string, number>();
  for (const s of datos.sesiones) sumar(porDia, s.on_date, s.minutes);
  for (const t of datos.tareas) {
    const extra = Math.max(
      0,
      t.actual_minutes - (datos.focoTotalPorTarea[t.id] ?? 0),
    );
    if (extra > 0) sumar(porDia, diaEn(t.done_at, datos.zona), extra);
  }
  for (const c of datos.candidaturas) sumar(porDia, c.on_date, c.minutes);
  for (const r of datos.rutinas) sumar(porDia, r.on_date, r.minutes);
  return porDia;
}

// Minutos de agenda de cada día: solo lo que tiene hora de inicio y de fin.
export function minutosDeAgendaPorDia(
  ocurrencias: {
    fecha: string;
    horaInicio: string | null;
    horaFin: string | null;
  }[],
): Map<string, number> {
  const porDia = new Map<string, number>();
  for (const o of ocurrencias) {
    if (!o.horaInicio || !o.horaFin) continue;
    const minutos = aMinutos(o.horaFin) - aMinutos(o.horaInicio);
    if (minutos > 0) sumar(porDia, o.fecha, minutos);
  }
  return porDia;
}

// ---- Juntarlo todo ----

// Un día del progreso. "anterior" son las horas del día de antes (para saber
// a qué hora te acostaste anoche). "ahora" solo se pasa si el día es hoy.
export function calcularDia(datos: {
  dia: HorasDelDia;
  anterior: HorasDelDia | null;
  usado: number;
  agenda: number;
  ahora?: string;
}): DiaProgreso {
  const { dia, anterior, usado, agenda, ahora } = datos;
  const despertar = dia.despierto ?? dia.levantado;
  const enPie = minutosEnPie(
    dia.levantado ?? dia.despierto,
    dia.acostarse,
    ahora,
  );
  return {
    fecha: dia.fecha,
    sueno: minutosDeSueno(anterior?.acostarse ?? null, despertar),
    enCama: minutosEnCama(dia.despierto, dia.levantado),
    enPie,
    usado,
    agenda,
    sinApuntar: enPie === null ? null : Math.max(0, enPie - usado - agenda),
    esHoy: ahora !== undefined,
  };
}

export type Media = { total: number; dias: number; media: number | null };

function media(valores: (number | null)[]): Media {
  const conDato = valores.filter((v): v is number => v !== null);
  const total = conDato.reduce((s, v) => s + v, 0);
  return {
    total,
    dias: conDato.length,
    media: conDato.length ? Math.round(total / conDato.length) : null,
  };
}

export type ResumenProgreso = {
  sueno: Media;
  enCama: Media;
  enPie: Media;
  usado: Media;
  agenda: Media;
  sinApuntar: Media;
};

// Totales y medias por día. Cada media solo cuenta los días que tienen ese
// dato. Hoy no entra en las medias de sueño, en pie y sin apuntar, porque
// el día aún no ha terminado (sí cuenta el sueño de anoche).
export function resumirProgreso(dias: DiaProgreso[]): ResumenProgreso {
  const cerrados = dias.filter((d) => !d.esHoy);
  // "Usado" y "agenda" solo en días de los que sabes algo de tu horario,
  // para que un día sin datos no baje la media a 0.
  const conDatos = cerrados.filter((d) => d.enPie !== null);
  return {
    sueno: media(dias.map((d) => d.sueno)),
    enCama: media(dias.map((d) => d.enCama)),
    enPie: media(cerrados.map((d) => d.enPie)),
    usado: media(conDatos.map((d) => d.usado)),
    agenda: media(conDatos.map((d) => d.agenda)),
    sinApuntar: media(conDatos.map((d) => d.sinApuntar)),
  };
}

// Qué parte de "en pie" es cada cosa, para pintar la barra (de 0 a 100).
export function reparto(dia: DiaProgreso): {
  usado: number;
  agenda: number;
  sinApuntar: number;
} | null {
  if (!dia.enPie) return null;
  const usado = Math.min(100, Math.round((dia.usado / dia.enPie) * 100));
  const agenda = Math.min(
    100 - usado,
    Math.round((dia.agenda / dia.enPie) * 100),
  );
  return { usado, agenda, sinApuntar: 100 - usado - agenda };
}
