import { leerColor } from "./colores";
import { z } from "zod";
import { textoOpcional } from "./agenda";
import { primerEnlace, type Resultado } from "./bandeja";

// Reglas de las Áreas y los Proyectos. Funciones puras, con pruebas en areas.test.ts.
//
// Un área es una gran parte de tu vida (Estudios, Empleo...). Dentro tiene
// proyectos. Cada proyecto puede tener un tipo que escribes tú («Asignatura»,
// «Deporte»...). Si el tipo es «Asignatura» (o «Materia»), el proyecto
// funciona como asignatura: sus metas pueden ser entregas y exámenes.
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
  // Su color en la Agenda (ver colores.ts). Vacío = verde oscuro.
  color?: string | null;
};

export const TIPOS_PROYECTO = ["proyecto", "asignatura"] as const;
export type TipoProyecto = (typeof TIPOS_PROYECTO)[number];

export type Proyecto = {
  id: string;
  area_id: string;
  name: string;
  kind: TipoProyecto;
  label: string | null; // el tipo que escribes tú; vacío = «Proyecto»
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

// Asignaturas primero, luego el resto juntos por tipo; dentro, por nombre.
// Archivados al final.
export function ordenarProyectos<T extends Proyecto>(proyectos: T[]): T[] {
  return [...proyectos].sort(
    (a, b) =>
      Number(a.archived_at !== null) - Number(b.archived_at !== null) ||
      Number(a.kind !== "asignatura") - Number(b.kind !== "asignatura") ||
      (a.label ?? "").localeCompare(b.label ?? "", "es") ||
      a.name.localeCompare(b.name, "es"),
  );
}

// ---- Tipo de proyecto ----

// Para comparar tipos sin que importen mayúsculas, tildes ni espacios.
function normalizar(texto: string): string {
  return texto
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Los tipos que hacen que un proyecto funcione como asignatura.
const TIPOS_ASIGNATURA = ["asignatura", "materia"];

// Del tipo que escribes sale cómo funciona el proyecto por dentro.
export function tipoDesdeEtiqueta(label: string | null): TipoProyecto {
  return label !== null && TIPOS_ASIGNATURA.includes(normalizar(label))
    ? "asignatura"
    : "proyecto";
}

// El nombre del tipo que se enseña: el tuyo, o «Proyecto» si lo dejas vacío.
export function nombreTipoProyecto(
  p: Pick<Proyecto, "label" | "kind">,
): string {
  if (p.label) return p.label;
  return p.kind === "asignatura" ? "Asignatura" : "Proyecto";
}

// Los tipos que se sugieren al escribir: primero los que ya usas en esta
// área (los más usados antes), luego los de otras áreas y, al final,
// «Proyecto» y «Asignatura» si aún no los has usado. Sin repetir.
export function sugerenciasTipo(
  proyectos: Pick<Proyecto, "area_id" | "label">[],
  areaId: string,
): string[] {
  const cuenta = new Map<
    string,
    { texto: string; aqui: number; total: number }
  >();
  for (const p of proyectos) {
    if (!p.label || normalizar(p.label) === "") continue;
    const clave = normalizar(p.label);
    const actual = cuenta.get(clave) ?? {
      texto: p.label.trim(),
      aqui: 0,
      total: 0,
    };
    actual.total += 1;
    if (p.area_id === areaId) actual.aqui += 1;
    cuenta.set(clave, actual);
  }
  const usados = [...cuenta.values()]
    .sort(
      (a, b) =>
        b.aqui - a.aqui ||
        b.total - a.total ||
        a.texto.localeCompare(b.texto, "es"),
    )
    .map((t) => t.texto);
  for (const base of ["Proyecto", "Asignatura"])
    if (!cuenta.has(normalizar(base))) usados.push(base);
  return usados;
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

// ---- Tareas y proyectos ----

export type GrupoOpciones = {
  area: string;
  proyectos: { id: string; name: string; archivado: boolean }[];
};

// Tus proyectos agrupados por área, para el selector «Proyecto» de una tarea.
// Los archivados (o de un área archivada) van marcados: el selector solo los
// enseña si la tarea ya está en uno, para no perderlo al guardar.
export function opcionesProyecto(
  areas: Area[],
  proyectos: Proyecto[],
): GrupoOpciones[] {
  return ordenarAreas(areas)
    .map((area) => ({
      area: area.name,
      proyectos: ordenarProyectos(
        proyectos.filter((p) => p.area_id === area.id),
      ).map((p) => ({
        id: p.id,
        name: p.name,
        archivado: Boolean(p.archived_at || area.archived_at),
      })),
    }))
    .filter((g) => g.proyectos.length > 0);
}

// Las opciones que se ven en el selector de una tarea concreta.
export function opcionesVisibles(
  grupos: GrupoOpciones[],
  actual: string | null,
): GrupoOpciones[] {
  return grupos
    .map((g) => ({
      ...g,
      proyectos: g.proyectos.filter((p) => !p.archivado || p.id === actual),
    }))
    .filter((g) => g.proyectos.length > 0);
}

// Nombre del proyecto de una tarea, para mostrarlo en la lista.
export function nombreProyecto(
  grupos: GrupoOpciones[],
  id: string | null,
): string | null {
  if (!id) return null;
  for (const g of grupos) {
    const p = g.proyectos.find((p) => p.id === id);
    if (p) return p.name;
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El valor del selector: vacío = sin proyecto.
export function prepararProyectoDeTarea(
  valor: unknown,
): Resultado<string | null> {
  if (valor === null || valor === undefined || valor === "")
    return { ok: true, valor: null };
  if (typeof valor === "string" && UUID.test(valor)) return { ok: true, valor };
  return { ok: false, error: "El proyecto elegido no es válido." };
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

export type DatosArea = Pick<
  Area,
  "name" | "weekly_minutes" | "personal_time" | "color"
>;

export function prepararArea(datos: {
  name: unknown;
  horas: unknown;
  personal_time: unknown;
  color?: unknown;
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
      color: leerColor(datos.color),
    },
  };
}

const esquemaProyecto = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre.")
    .max(120, "Como mucho 120 caracteres."),
  label: textoOpcional.pipe(
    z.string().max(40, "El tipo admite 40 caracteres.").nullable(),
  ),
  notes: textoOpcional.pipe(
    z.string().max(5000, "Las notas admiten 5000 caracteres.").nullable(),
  ),
  url: textoOpcional.refine((v) => v === null || primerEnlace(v) === v, {
    error: "El enlace tiene que empezar por http:// o https://.",
  }),
});

export type DatosProyecto = Pick<
  Proyecto,
  "name" | "kind" | "label" | "notes" | "url"
>;

export function prepararProyecto(datos: {
  name: unknown;
  label: unknown;
  notes: unknown;
  url: unknown;
}): Resultado<DatosProyecto> {
  const r = esquemaProyecto.safeParse({
    name: datos.name ?? "",
    label: datos.label ?? "",
    notes: datos.notes ?? "",
    url: datos.url ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return {
    ok: true,
    valor: { ...r.data, kind: tipoDesdeEtiqueta(r.data.label) },
  };
}
