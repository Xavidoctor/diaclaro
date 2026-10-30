import { z } from "zod";
import { textoOpcional } from "./agenda";
import { primerEnlace, type Resultado } from "./bandeja";

// Reglas de las Áreas y los Proyectos. Funciones puras, con pruebas en areas.test.ts.
//
// Un área es una gran parte de tu vida (Estudios, Empleo...). Dentro tiene
// proyectos; una asignatura es un proyecto de tipo "asignatura".
// Cada área puede tener un presupuesto: las horas a la semana que quieres darle.
// Un área de "tiempo personal" (un hobby) no tiene objetivo obligatorio y no
// cuenta como compromiso.

export type Area = {
  id: string;
  name: string;
  weekly_minutes: number | null; // null = sin presupuesto
  personal_time: boolean;
  position: number;
  archived_at: string | null;
};

export const TIPOS_PROYECTO = ["proyecto", "asignatura"] as const;
export type TipoProyecto = (typeof TIPOS_PROYECTO)[number];

export type Proyecto = {
  id: string;
  area_id: string;
  name: string;
  kind: TipoProyecto;
  notes: string | null;
  url: string | null;
  archived_at: string | null;
};

// Las áreas que propone DíaClaro al empezar (las de la propuesta aprobada).
// Sin horas: el presupuesto lo pones tú.
export const AREAS_SUGERIDAS: { name: string; personal_time: boolean }[] = [
  { name: "Estudios", personal_time: false },
  { name: "Empleo", personal_time: false },
  { name: "Aprender IA", personal_time: false },
  { name: "Dropshipping", personal_time: true },
  { name: "Vida y salud", personal_time: false },
];

// ---- Horas ----

// "6" → 360, "1,5" → 90, "1.5" → 90, "" → null. Acepta coma o punto.
export function horasAMinutos(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  if (!/^\d+(\.\d+)?$/.test(limpio)) return Number.NaN;
  return Math.round(Number(limpio) * 60);
}

// 360 → "6 h", 90 → "1 h 30 min", 45 → "45 min".
export function textoHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Para rellenar el formulario: 90 → "1,5", null → "".
export function minutosAHorasTexto(minutos: number | null): string {
  if (minutos === null) return "";
  return String(Math.round((minutos / 60) * 100) / 100).replace(".", ",");
}

// Cómo se describe el presupuesto de un área en la lista.
export function textoPresupuesto(
  area: Pick<Area, "weekly_minutes" | "personal_time">,
): string {
  if (area.weekly_minutes === null || area.weekly_minutes === 0)
    return area.personal_time
      ? "Tiempo personal, sin objetivo"
      : "Sin horas fijadas";
  const horas = textoHoras(area.weekly_minutes);
  return area.personal_time
    ? `Tiempo personal · hasta ${horas} a la semana`
    : `${horas} a la semana`;
}

// Suma de la semana: las horas que te comprometes a dar (sin el tiempo
// personal) y, aparte, el tiempo personal que te reservas.
export function resumenSemana(areas: Area[]): {
  compromiso: number;
  personal: number;
} {
  let compromiso = 0;
  let personal = 0;
  for (const a of areas) {
    if (a.archived_at || a.weekly_minutes === null) continue;
    if (a.personal_time) personal += a.weekly_minutes;
    else compromiso += a.weekly_minutes;
  }
  return { compromiso, personal };
}

// Orden de la lista: primero las activas por su posición, las archivadas al final.
export function ordenarAreas<T extends Area>(areas: T[]): T[] {
  return [...areas].sort(
    (a, b) =>
      Number(a.archived_at !== null) - Number(b.archived_at !== null) ||
      a.position - b.position ||
      a.name.localeCompare(b.name, "es"),
  );
}

// Asignaturas primero, luego el resto; dentro, por nombre. Archivados al final.
export function ordenarProyectos<T extends Proyecto>(proyectos: T[]): T[] {
  return [...proyectos].sort(
    (a, b) =>
      Number(a.archived_at !== null) - Number(b.archived_at !== null) ||
      Number(a.kind !== "asignatura") - Number(b.kind !== "asignatura") ||
      a.name.localeCompare(b.name, "es"),
  );
}

// Sube (-1) o baja (+1) un elemento un puesto. Devuelve la lista nueva de ids.
export function moverEnLista(
  ids: string[],
  id: string,
  paso: -1 | 1,
): string[] {
  const i = ids.indexOf(id);
  const j = i + paso;
  if (i === -1 || j < 0 || j >= ids.length) return ids;
  const nueva = [...ids];
  [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
  return nueva;
}

// ---- Formularios ----

const horasSemana = z
  .string()
  .transform((v) => horasAMinutos(v))
  .pipe(
    z
      .number({
        error: "Las horas tienen que ser un número (por ejemplo, 6 o 1,5).",
      })
      .min(0, "Las horas no pueden ser negativas.")
      .max(10080, "Una semana tiene 168 horas como mucho.")
      .nullable(),
  );

const esquemaArea = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre (por ejemplo, Estudios).")
    .max(80, "Como mucho 80 caracteres."),
  horas: horasSemana,
  personal_time: z.boolean(),
});

export type DatosArea = Pick<Area, "name" | "weekly_minutes" | "personal_time">;

export function prepararArea(datos: {
  name: unknown;
  horas: unknown;
  personal_time: unknown;
}): Resultado<DatosArea> {
  const r = esquemaArea.safeParse({
    name: datos.name ?? "",
    horas: datos.horas ?? "",
    personal_time: datos.personal_time === "si",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return {
    ok: true,
    valor: {
      name: r.data.name,
      weekly_minutes: r.data.horas,
      personal_time: r.data.personal_time,
    },
  };
}

const esquemaProyecto = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre.")
    .max(120, "Como mucho 120 caracteres."),
  kind: z.enum(TIPOS_PROYECTO, { error: "Elige si es proyecto o asignatura." }),
  notes: textoOpcional.pipe(
    z.string().max(5000, "Las notas admiten 5000 caracteres.").nullable(),
  ),
  url: textoOpcional.refine((v) => v === null || primerEnlace(v) === v, {
    error: "El enlace tiene que empezar por http:// o https://.",
  }),
});

export type DatosProyecto = Pick<Proyecto, "name" | "kind" | "notes" | "url">;

export function prepararProyecto(datos: {
  name: unknown;
  kind: unknown;
  notes: unknown;
  url: unknown;
}): Resultado<DatosProyecto> {
  const r = esquemaProyecto.safeParse({
    name: datos.name ?? "",
    kind: datos.kind ?? "proyecto",
    notes: datos.notes ?? "",
    url: datos.url ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}
