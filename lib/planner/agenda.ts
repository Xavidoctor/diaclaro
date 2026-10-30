import { RRule } from "rrule";
import { z } from "zod";
import { esFecha } from "./fechas";
import type { Resultado } from "./bandeja";

// Reglas de la Agenda. Funciones puras: no tocan la base de datos y se prueban con `npm test`.
//
// Un compromiso (evento) puede repetirse. La repetición se guarda como una
// "regla RRULE", el formato estándar que usan Google Calendar y casi todos los
// calendarios (por ejemplo "FREQ=WEEKLY;BYDAY=MO,TU,WE"). La librería rrule
// calcula qué días toca. Las excepciones cambian un solo día sin tocar la regla.

// ---- Tipos ----

export type Franja = "mañana" | "tarde" | "noche";
export const FRANJAS: Franja[] = ["mañana", "tarde", "noche"];

export type Evento = {
  id: string;
  title: string;
  notes: string | null;
  start_date: string; // primer día, "2026-10-26"
  start_time: string | null; // "16:00", o null si no hay hora exacta
  end_time: string | null;
  part_of_day: Franja | null; // franja aproximada cuando no hay hora exacta
  repeat_rule: string | null; // regla RRULE, o null si no se repite
};

// Lo que cambia en un día concreto de un evento que se repite.
export type Excepcion = {
  event_id: string;
  on_date: string; // el día que tocaba según la regla
  cancelled: boolean;
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
};

// Una aparición del evento en un día concreto, ya con las excepciones aplicadas.
export type Ocurrencia = {
  eventoId: string;
  titulo: string;
  fecha: string;
  fechaOriginal: string; // el día que tocaba (sirve para crear excepciones)
  horaInicio: string | null;
  horaFin: string | null;
  franja: Franja | null;
  seRepite: boolean;
  cambiada: boolean;
  // Solo en lo que viene de tu Google Calendar (ver google-calendar.ts).
  // "libre" es cuando en Google lo marcaste como «Disponible».
  google?: { libre: boolean };
};

// ---- Repeticiones ----

export const DIAS_SEMANA = [
  { codigo: "MO", corto: "L", nombre: "lunes" },
  { codigo: "TU", corto: "M", nombre: "martes" },
  { codigo: "WE", corto: "X", nombre: "miércoles" },
  { codigo: "TH", corto: "J", nombre: "jueves" },
  { codigo: "FR", corto: "V", nombre: "viernes" },
  { codigo: "SA", corto: "S", nombre: "sábado" },
  { codigo: "SU", corto: "D", nombre: "domingo" },
] as const;

export type CodigoDia = (typeof DIAS_SEMANA)[number]["codigo"];
export const CODIGOS = DIAS_SEMANA.map((d) => d.codigo) as CodigoDia[];

export type Repeticion =
  | { tipo: "no" }
  | { tipo: "diaria"; hasta: string | null }
  | { tipo: "semanal"; dias: CodigoDia[]; hasta: string | null };

// Las fechas van a rrule a las 00:00 en UTC ("hora flotante"): así un lunes
// sigue siendo lunes en cualquier zona horaria.
function aUTC(fecha: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}
function deUTC(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// De lo elegido en el formulario a la regla que se guarda.
export function crearRegla(rep: Repeticion): string | null {
  if (rep.tipo === "no") return null;
  const until = rep.hasta ? aUTC(rep.hasta) : null;
  const regla =
    rep.tipo === "diaria"
      ? new RRule({ freq: RRule.DAILY, until })
      : new RRule({
          freq: RRule.WEEKLY,
          byweekday: rep.dias.map((c) => CODIGOS.indexOf(c)),
          until,
        });
  return regla.toString().replace(/^RRULE:/, "");
}

// De la regla guardada a lo que muestra el formulario.
export function leerRegla(regla: string | null): Repeticion {
  if (!regla) return { tipo: "no" };
  const op = RRule.parseString(regla);
  const hasta = op.until ? deUTC(op.until) : null;
  if (op.freq === RRule.DAILY) return { tipo: "diaria", hasta };
  const lista = Array.isArray(op.byweekday)
    ? op.byweekday
    : op.byweekday != null
      ? [op.byweekday]
      : [];
  const dias = lista
    .map((d) =>
      typeof d === "number" ? d : (d as { weekday: number }).weekday,
    )
    .sort((a, b) => a - b)
    .map((n) => CODIGOS[n]);
  return { tipo: "semanal", dias, hasta };
}

// Frase para la pantalla: "Cada lunes, martes y miércoles, hasta el 2026-12-19".
export function describirRepeticion(rep: Repeticion): string {
  if (rep.tipo === "no") return "No se repite";
  let texto =
    rep.tipo === "diaria"
      ? "Cada día"
      : `Cada ${unirConY(rep.dias.map((c) => DIAS_SEMANA[CODIGOS.indexOf(c)].nombre))}`;
  if (rep.hasta) texto += `, hasta el ${rep.hasta}`;
  return texto;
}

function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

// Los días (entre desde y hasta, ambos incluidos) en que toca el evento según su regla.
export function fechasDelEvento(
  evento: Pick<Evento, "start_date" | "repeat_rule">,
  desde: string,
  hasta: string,
): string[] {
  if (!evento.repeat_rule) {
    const dentro = evento.start_date >= desde && evento.start_date <= hasta;
    return dentro ? [evento.start_date] : [];
  }
  const regla = new RRule({
    ...RRule.parseString(evento.repeat_rule),
    dtstart: aUTC(evento.start_date),
  });
  return regla.between(aUTC(desde), aUTC(hasta), true).map(deUTC);
}

export function tocaEseDia(
  evento: Pick<Evento, "start_date" | "repeat_rule">,
  fecha: string,
): boolean {
  return fechasDelEvento(evento, fecha, fecha).length === 1;
}

// Todas las apariciones de los eventos entre dos días, con las excepciones aplicadas:
// un día cancelado desaparece y un día movido aparece en su nueva fecha.
export function ocurrenciasEntre(
  eventos: Evento[],
  excepciones: Excepcion[],
  desde: string,
  hasta: string,
): Ocurrencia[] {
  const porClave = new Map(
    excepciones.map((e) => [`${e.event_id}|${e.on_date}`, e]),
  );
  const resultado: Ocurrencia[] = [];

  for (const evento of eventos) {
    const base = {
      eventoId: evento.id,
      titulo: evento.title,
      franja: evento.part_of_day,
      seRepite: evento.repeat_rule !== null,
    };

    // 1. Los días que tocan según la regla, si no tienen excepción.
    for (const fecha of fechasDelEvento(evento, desde, hasta)) {
      if (porClave.has(`${evento.id}|${fecha}`)) continue;
      resultado.push({
        ...base,
        fecha,
        fechaOriginal: fecha,
        horaInicio: evento.start_time,
        horaFin: evento.end_time,
        cambiada: false,
      });
    }

    // 2. Los días movidos o con otra hora que caen dentro del periodo.
    // El día original puede estar fuera (por ejemplo, movido del lunes de la semana anterior).
    for (const ex of excepciones) {
      if (ex.event_id !== evento.id || ex.cancelled || !ex.new_date) continue;
      if (ex.new_date < desde || ex.new_date > hasta) continue;
      if (!tocaEseDia(evento, ex.on_date)) continue; // la regla cambió y ese día ya no toca
      resultado.push({
        ...base,
        fecha: ex.new_date,
        fechaOriginal: ex.on_date,
        horaInicio: ex.new_start_time,
        horaFin: ex.new_end_time,
        cambiada: true,
      });
    }
  }

  return resultado.sort(compararOcurrencias);
}

// Orden dentro de la lista: por día; en cada día, primero lo que no tiene hora
// ni franja, y luego por hora. Lo que solo tiene franja se coloca en su parte
// del día (el número es solo para ordenar, no es una hora que se muestre).
const ORDEN_FRANJA: Record<Franja, string> = {
  mañana: "06:00",
  tarde: "14:00",
  noche: "20:00",
};

function claveOrden(o: Ocurrencia): string {
  if (o.horaInicio) return `${o.horaInicio}|1`;
  if (o.franja) return `${ORDEN_FRANJA[o.franja]}|0`;
  return "";
}

export function compararOcurrencias(a: Ocurrencia, b: Ocurrencia): number {
  return (
    a.fecha.localeCompare(b.fecha) ||
    claveOrden(a).localeCompare(claveOrden(b)) ||
    a.titulo.localeCompare(b.titulo, "es")
  );
}

// Reparte las apariciones en los días pedidos (también los días vacíos).
export function agruparPorDia(ocurrencias: Ocurrencia[], dias: string[]) {
  return dias.map((fecha) => ({
    fecha,
    ocurrencias: ocurrencias.filter((o) => o.fecha === fecha),
  }));
}

// "16:00–17:30", "16:00", "Por la tarde" o "Sin hora".
export function textoHora(
  o: Pick<Ocurrencia, "horaInicio" | "horaFin" | "franja">,
): string {
  if (o.horaInicio && o.horaFin) return `${o.horaInicio}–${o.horaFin}`;
  if (o.horaInicio) return o.horaInicio;
  if (o.franja) return `Por la ${o.franja}`;
  return "Sin hora";
}

// Postgres devuelve las horas como "16:00:00"; la app usa "16:00".
export function horaCorta(hora: string | null): string | null {
  return hora ? hora.slice(0, 5) : null;
}

// ---- Formularios ----

export const MAX_TITULO_EVENTO = 200;
export const MAX_NOTAS_EVENTO = 2000;

export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const fechaObligatoria = (mensaje: string) =>
  z.string().trim().refine(esFecha, { error: mensaje });

const fechaOpcional = textoOpcional.refine((v) => v === null || esFecha(v), {
  error: "La fecha final no es válida.",
});

export const horaOpcional = textoOpcional.refine(
  (v) => v === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
  { error: "La hora no es válida." },
);

// Comprueba la hora de inicio y fin: el fin solo con inicio, y siempre después.
export function revisarHoras(
  inicio: string | null,
  fin: string | null,
): string | null {
  if (fin && !inicio) return "Si pones hora de fin, pon también la de inicio.";
  if (inicio && fin && fin <= inicio)
    return "La hora de fin tiene que ser después de la de inicio.";
  return null;
}

const esquemaEvento = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Ponle un nombre (por ejemplo, Tutoría).")
      .max(MAX_TITULO_EVENTO, `Como mucho ${MAX_TITULO_EVENTO} caracteres.`),
    notes: textoOpcional.pipe(
      z
        .string()
        .max(
          MAX_NOTAS_EVENTO,
          `Las notas admiten ${MAX_NOTAS_EVENTO} caracteres.`,
        )
        .nullable(),
    ),
    start_date: fechaObligatoria(
      "Elige el día (o el primer día, si se repite).",
    ),
    start_time: horaOpcional,
    end_time: horaOpcional,
    part_of_day: textoOpcional.pipe(z.enum(FRANJAS).nullable()),
    repetir: z.enum(["no", "diaria", "semanal"], {
      error: "Elige si se repite o no.",
    }),
    dias: z.array(z.enum(CODIGOS)),
    hasta: fechaOpcional,
  })
  .superRefine((d, ctx) => {
    const errorHoras = revisarHoras(d.start_time, d.end_time);
    if (errorHoras) ctx.addIssue({ code: "custom", message: errorHoras });
    if (d.repetir === "semanal" && d.dias.length === 0)
      ctx.addIssue({
        code: "custom",
        message: "Marca qué días de la semana se repite.",
      });
    if (d.repetir !== "no" && d.hasta && d.hasta < d.start_date)
      ctx.addIssue({
        code: "custom",
        message: "La fecha final tiene que ser después del primer día.",
      });
  });

export type DatosEvento = Omit<Evento, "id">;

// Lo que llega del formulario de evento, comprobado y listo para guardar.
// Hora y franja son opcionales: si no las pones, se quedan vacías.
export function prepararEvento(datos: {
  title: unknown;
  notes: unknown;
  start_date: unknown;
  start_time: unknown;
  end_time: unknown;
  part_of_day: unknown;
  repetir: unknown;
  dias: unknown[];
  hasta: unknown;
}): Resultado<DatosEvento> {
  const r = esquemaEvento.safeParse({
    title: datos.title ?? "",
    notes: datos.notes ?? "",
    start_date: datos.start_date ?? "",
    start_time: datos.start_time ?? "",
    end_time: datos.end_time ?? "",
    part_of_day: datos.part_of_day ?? "",
    repetir: datos.repetir ?? "no",
    dias: datos.dias,
    hasta: datos.hasta ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const d = r.data;

  const repeticion: Repeticion =
    d.repetir === "no"
      ? { tipo: "no" }
      : d.repetir === "diaria"
        ? { tipo: "diaria", hasta: d.hasta }
        : {
            tipo: "semanal",
            dias: CODIGOS.filter((c) => d.dias.includes(c)),
            hasta: d.hasta,
          };

  return {
    ok: true,
    valor: {
      title: d.title,
      notes: d.notes,
      start_date: d.start_date,
      start_time: d.start_time,
      end_time: d.end_time,
      // Con hora exacta, la franja sobra.
      part_of_day: d.start_time ? null : d.part_of_day,
      repeat_rule: crearRegla(repeticion),
    },
  };
}

const esquemaCambioDia = z
  .object({
    new_date: fechaObligatoria("Elige a qué día se mueve."),
    new_start_time: horaOpcional,
    new_end_time: horaOpcional,
  })
  .superRefine((d, ctx) => {
    const errorHoras = revisarHoras(d.new_start_time, d.new_end_time);
    if (errorHoras) ctx.addIssue({ code: "custom", message: errorHoras });
  });

export type CambioDia = z.infer<typeof esquemaCambioDia>;

// Cambiar un solo día de un evento que se repite: otro día u otra hora.
export function prepararCambioDia(datos: {
  new_date: unknown;
  new_start_time: unknown;
  new_end_time: unknown;
}): Resultado<CambioDia> {
  const r = esquemaCambioDia.safeParse({
    new_date: datos.new_date ?? "",
    new_start_time: datos.new_start_time ?? "",
    new_end_time: datos.new_end_time ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}

// Fecha de la dirección (?desde=2026-10-30), o hoy si no hay o no es válida.
export function leerFechaParam(valor: unknown, hoy: string): string {
  return typeof valor === "string" && esFecha(valor) ? valor : hoy;
}
