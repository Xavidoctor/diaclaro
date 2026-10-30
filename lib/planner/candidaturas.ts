import { differenceInCalendarDays, parseISO } from "date-fns";
import { z } from "zod";
import { textoOpcional } from "./agenda";
import { textoHoras } from "./areas";
import { primerEnlace, type Resultado } from "./bandeja";
import { esFecha, fechaCorta, sumarDias } from "./fechas";

// Reglas de las Candidaturas de empleo. Funciones puras, con pruebas en candidaturas.test.ts.
//
// Una candidatura es una oferta a la que te presentas (o quieres presentarte).
// Tiene un estado y, si quieres, un día de seguimiento: ese día sale en Hoy
// para que no se te olvide llamar o escribir.
// Las fechas nunca se inventan: si no las pones, se quedan vacías.

export const ESTADOS = [
  "por_enviar",
  "enviada",
  "entrevista",
  "oferta",
  "rechazada",
  "descartada",
] as const;
export type Estado = (typeof ESTADOS)[number];

// Cómo se llama cada estado en la pantalla.
export const NOMBRE_ESTADO: Record<Estado, string> = {
  por_enviar: "Por enviar",
  enviada: "Enviada",
  entrevista: "Entrevista",
  oferta: "Oferta",
  rechazada: "Rechazada",
  descartada: "Descartada",
};

// Estas ya están cerradas: no salen en Hoy ni cuentan como activas.
const CERRADAS: Estado[] = ["rechazada", "descartada"];

export type Candidatura = {
  id: string;
  company: string;
  role: string;
  url: string | null;
  status: Estado;
  applied_on: string | null;
  next_follow_up: string | null;
  next_step: string | null;
  notes: string | null;
  area_id: string | null; // el área donde cuenta su tiempo (normalmente Empleo)
  created_at: string;
};

export function estaActiva(c: Pick<Candidatura, "status">): boolean {
  return !CERRADAS.includes(c.status);
}

// Orden de la lista: primero las que tienen seguimiento (la más cercana arriba),
// luego las demás, de la más nueva a la más antigua.
export function ordenarCandidaturas<T extends Candidatura>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    if (a.next_follow_up && b.next_follow_up)
      return (
        a.next_follow_up.localeCompare(b.next_follow_up) ||
        b.created_at.localeCompare(a.created_at)
      );
    if (a.next_follow_up) return -1;
    if (b.next_follow_up) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

// Separa la lista en activas y cerradas, cada una ya ordenada.
export function separarCandidaturas<T extends Candidatura>(
  lista: T[],
): { activas: T[]; cerradas: T[] } {
  const ordenada = ordenarCandidaturas(lista);
  return {
    activas: ordenada.filter(estaActiva),
    cerradas: ordenada.filter((c) => !estaActiva(c)),
  };
}

// Los seguimientos que tocan hoy o que ya se han pasado (solo de candidaturas activas).
export function seguimientosPendientes<T extends Candidatura>(
  lista: T[],
  hoy: string,
): T[] {
  return ordenarCandidaturas(
    lista.filter(
      (c) =>
        estaActiva(c) && c.next_follow_up !== null && c.next_follow_up <= hoy,
    ),
  );
}

// Cuántas hay en cada estado, para el resumen de arriba (solo los que tienen alguna).
export function contarPorEstado(
  lista: Pick<Candidatura, "status">[],
): { estado: Estado; nombre: string; total: number }[] {
  return ESTADOS.map((estado) => ({
    estado,
    nombre: NOMBRE_ESTADO[estado],
    total: lista.filter((c) => c.status === estado).length,
  })).filter((e) => e.total > 0);
}

// "Hoy", "Mañana", "Ayer", "Hace 3 días", "En 5 días" o, si queda lejos, "12 nov.".
export function textoSeguimiento(fecha: string, hoy: string): string {
  const dias = differenceInCalendarDays(parseISO(fecha), parseISO(hoy));
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  if (dias < 0) return `Hace ${-dias} días`;
  if (dias <= 6) return `En ${dias} días`;
  return fechaCorta(fecha);
}

// ---- Formulario ----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fecha = (mensaje: string) =>
  textoOpcional.refine((v) => v === null || esFecha(v), { error: mensaje });

const esquemaCandidatura = z
  .object({
    company: z
      .string()
      .trim()
      .min(1, "Escribe el nombre de la empresa.")
      .max(120, "El nombre de la empresa admite 120 caracteres."),
    role: z
      .string()
      .trim()
      .min(1, "Escribe el puesto.")
      .max(160, "El puesto admite 160 caracteres."),
    url: textoOpcional.refine((v) => v === null || primerEnlace(v) === v, {
      error: "El enlace tiene que empezar por http:// o https://.",
    }),
    status: z.enum(ESTADOS, { error: "Elige un estado." }),
    applied_on: fecha("La fecha de envío no es válida."),
    next_follow_up: fecha("La fecha de seguimiento no es válida."),
    next_step: textoOpcional.pipe(
      z.string().max(300, "El próximo paso admite 300 caracteres.").nullable(),
    ),
    notes: textoOpcional.pipe(
      z.string().max(5000, "Las notas admiten 5000 caracteres.").nullable(),
    ),
    area_id: textoOpcional.refine((v) => v === null || UUID.test(v), {
      error: "El área elegida no es válida.",
    }),
  })
  .superRefine((d, ctx) => {
    if (d.applied_on && d.next_follow_up && d.next_follow_up < d.applied_on)
      ctx.addIssue({
        code: "custom",
        message: "El seguimiento no puede ser antes del día que la enviaste.",
      });
  });

export type DatosCandidatura = Omit<Candidatura, "id" | "created_at">;

export function prepararCandidatura(datos: {
  [K in keyof DatosCandidatura]: unknown;
}): Resultado<DatosCandidatura> {
  const r = esquemaCandidatura.safeParse({
    company: datos.company ?? "",
    role: datos.role ?? "",
    url: datos.url ?? "",
    status: datos.status || "por_enviar",
    applied_on: datos.applied_on ?? "",
    next_follow_up: datos.next_follow_up ?? "",
    next_step: datos.next_step ?? "",
    notes: datos.notes ?? "",
    area_id: datos.area_id ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}

// Al cambiar de estado con un botón rápido. Al cerrarla (rechazada o
// descartada) se quita el seguimiento para que no salga en Hoy.
// La fecha de envío no se toca: si quieres ponerla, la escribes tú.
export function cambiosAlCambiarEstado(
  nuevo: Estado,
): Partial<DatosCandidatura> {
  if (CERRADAS.includes(nuevo))
    return { status: nuevo, next_follow_up: null, next_step: null };
  return { status: nuevo };
}

export function esEstado(valor: unknown): valor is Estado {
  return (
    typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor)
  );
}

// ---- Historial ----

// Lo que va pasando con una candidatura, cada cosa con su día.
export const TIPOS_ENTRADA = ["estado", "seguimiento", "nota"] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

export type EntradaHistorial = {
  id: string;
  application_id: string;
  on_date: string;
  kind: TipoEntrada;
  status: Estado | null;
  note: string | null;
  minutes: number | null; // minutos dedicados (vacío = no lo apuntaste)
  created_at: string;
};

export type DatosEntrada = Pick<
  EntradaHistorial,
  "on_date" | "kind" | "status" | "note" | "minutes"
>;

// Lo más reciente arriba. El mismo día, la última que apuntaste primero.
export function ordenarHistorial<T extends EntradaHistorial>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      b.on_date.localeCompare(a.on_date) ||
      b.created_at.localeCompare(a.created_at),
  );
}

// Cómo se lee cada entrada en la pantalla.
export function textoEntrada(
  e: Pick<EntradaHistorial, "kind" | "status" | "note">,
): string {
  if (e.kind === "estado" && e.status) {
    const base = `Pasa a «${NOMBRE_ESTADO[e.status]}»`;
    return e.note ? `${base}: ${e.note}` : base;
  }
  if (e.kind === "seguimiento")
    return e.note ? `Seguimiento hecho: ${e.note}` : "Seguimiento hecho";
  return e.note ?? "";
}

// La entrada que se apunta sola al cambiar de estado con un botón rápido.
// El día es hoy porque es cuando lo marcas.
export function entradaCambioEstado(nuevo: Estado, hoy: string): DatosEntrada {
  return {
    on_date: hoy,
    kind: "estado",
    status: nuevo,
    note: null,
    minutes: null,
  };
}

// La entrada que se apunta sola al pulsar «Hecho» en un seguimiento.
// Guarda lo que tenías pensado hacer, para que no se pierda.
export function entradaSeguimientoHecho(
  c: Pick<Candidatura, "next_step">,
  hoy: string,
): DatosEntrada {
  return {
    on_date: hoy,
    kind: "seguimiento",
    status: null,
    note: c.next_step,
    minutes: null,
  };
}

const esquemaNota = z.object({
  on_date: z.string().trim().refine(esFecha, { error: "El día no es válido." }),
  note: z
    .string()
    .trim()
    .min(1, "Escribe qué ha pasado.")
    .max(2000, "La nota admite 2000 caracteres."),
  minutos: textoOpcional
    .transform((v) => (v === null ? null : Number(v)))
    .pipe(
      z
        .number({
          error: "Los minutos tienen que ser un número (por ejemplo, 45).",
        })
        .int("Los minutos tienen que ser un número entero.")
        .min(1, "Pon al menos 1 minuto, o déjalo vacío.")
        .max(1440, "Un día tiene 1440 minutos como mucho.")
        .nullable(),
    ),
});

// Una nota que apuntas tú (por ejemplo, "Me han llamado para una entrevista").
// No puede ser de un día futuro: el historial es lo que ya ha pasado.
// Los minutos son opcionales: si los pones, cuentan en la semana del área.
export function prepararNotaHistorial(
  datos: { on_date: unknown; note: unknown; minutos?: unknown },
  hoy: string,
): Resultado<DatosEntrada> {
  const r = esquemaNota.safeParse({
    on_date: datos.on_date ?? "",
    note: datos.note ?? "",
    minutos: datos.minutos ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  if (r.data.on_date > hoy)
    return {
      ok: false,
      error:
        "El historial es lo que ya ha pasado: elige hoy o un día anterior.",
    };
  return {
    ok: true,
    valor: {
      on_date: r.data.on_date,
      kind: "nota",
      status: null,
      note: r.data.note,
      minutes: r.data.minutos,
    },
  };
}

// ---- Tiempo en las áreas ----

// El área que se propone al apuntar una candidatura nueva: la que se llama
// «Empleo» (sin fijarse en mayúsculas ni tildes), si la tienes y no está archivada.
export function areaPorDefecto(
  areas: { id: string; name: string; archived_at: string | null }[],
): string | null {
  const normal = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  return (
    areas.find((a) => !a.archived_at && normal(a.name) === "empleo")?.id ?? null
  );
}

// El lunes de la semana de un día (las semanas empiezan en lunes).
export function lunesDe(dia: string): string {
  const d = parseISO(dia);
  const desdeLunes = (d.getDay() + 6) % 7;
  return sumarDias(dia, -desdeLunes);
}

// Minutos dedicados a candidaturas en cada área entre dos días (los dos incluidos).
// Las candidaturas sin área no cuentan en ninguna.
export function minutosPorArea(
  candidaturas: Pick<Candidatura, "id" | "area_id">[],
  entradas: Pick<EntradaHistorial, "application_id" | "on_date" | "minutes">[],
  desde: string,
  hasta: string,
): Map<string, number> {
  const areaDe = new Map(candidaturas.map((c) => [c.id, c.area_id]));
  const total = new Map<string, number>();
  for (const e of entradas) {
    if (!e.minutes || e.on_date < desde || e.on_date > hasta) continue;
    const area = areaDe.get(e.application_id);
    if (!area) continue;
    total.set(area, (total.get(area) ?? 0) + e.minutes);
  }
  return total;
}

// Todos los minutos apuntados en el historial de una candidatura.
export function minutosTotales(
  entradas: Pick<EntradaHistorial, "minutes">[],
): number {
  return entradas.reduce((suma, e) => suma + (e.minutes ?? 0), 0);
}

// La frase de la ficha del área: cuánto llevas esta semana en candidaturas y,
// si el área tiene horas fijadas, cuántas eran. Sin minutos, no se dice nada.
export function textoSemanaCandidaturas(
  minutos: number,
  presupuesto: number | null,
): string | null {
  if (minutos <= 0) return null;
  const base = `Esta semana llevas ${textoHoras(minutos)} en candidaturas`;
  return presupuesto
    ? `${base} (de las ${textoHoras(presupuesto)} que te propones aquí).`
    : `${base}.`;
}
