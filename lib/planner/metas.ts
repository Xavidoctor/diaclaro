import { differenceInCalendarDays, parseISO } from "date-fns";
import { z } from "zod";
import type { TipoProyecto } from "./areas";
import type { Resultado } from "./bandeja";
import { esFecha, fechaCorta, sumarDias } from "./fechas";

// Reglas de las metas de los proyectos. Funciones puras, con pruebas en metas.test.ts.
//
// Una meta es algo que quieres conseguir dentro de un proyecto, con su fecha.
// En una asignatura, la meta puede ser una entrega o un examen.
// La fecha y el aviso son opcionales: si aún no los sabes, se dejan vacíos.

export const TIPOS_META = ["meta", "entrega", "examen"] as const;
export type TipoMeta = (typeof TIPOS_META)[number];

export type Meta = {
  id: string;
  project_id: string;
  title: string;
  kind: TipoMeta;
  due_date: string | null; // "2026-11-20"
  remind_at: string | null; // "2026-11-18T09:00:00", en tu hora
  done_at: string | null;
};

export const NOMBRE_TIPO: Record<TipoMeta, string> = {
  meta: "Meta",
  entrega: "Entrega",
  examen: "Examen",
};

// Qué tipos se pueden elegir: en una asignatura, los tres; en un proyecto,
// solo «meta» (así el formulario no enseña nada que no hace falta).
export function tiposParaProyecto(kind: TipoProyecto): TipoMeta[] {
  return kind === "asignatura" ? ["entrega", "examen", "meta"] : ["meta"];
}

// ---- Formulario ----

const textoLimpio = z.string().trim();

const esquemaMeta = z.object({
  title: textoLimpio
    .min(1, "Escribe qué quieres conseguir.")
    .max(200, "El título es demasiado largo (máximo 200 letras)."),
  kind: z.enum(TIPOS_META, { error: "El tipo no es válido." }),
  due_date: textoLimpio.refine((v) => v === "" || esFecha(v), {
    error: "La fecha no es válida.",
  }),
  aviso_dia: textoLimpio.refine((v) => v === "" || esFecha(v), {
    error: "El día del aviso no es válido.",
  }),
  aviso_hora: textoLimpio.refine(
    (v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
    { error: "La hora del aviso no es válida." },
  ),
});

export type DatosMeta = {
  title: string;
  kind: TipoMeta;
  due_date: string | null;
  remind_at: string | null;
};

// Comprueba lo escrito en el formulario. El aviso necesita día y hora
// (si no pones ninguno de los dos, no hay aviso).
export function prepararMeta(datos: {
  title: unknown;
  kind: unknown;
  due_date: unknown;
  aviso_dia: unknown;
  aviso_hora: unknown;
}): Resultado<DatosMeta> {
  const r = esquemaMeta.safeParse({
    title: datos.title ?? "",
    kind: datos.kind || "meta",
    due_date: datos.due_date ?? "",
    aviso_dia: datos.aviso_dia ?? "",
    aviso_hora: datos.aviso_hora ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const { title, kind, due_date, aviso_dia, aviso_hora } = r.data;
  if ((aviso_dia === "") !== (aviso_hora === ""))
    return {
      ok: false,
      error: "Para el aviso, pon el día y la hora (o deja los dos vacíos).",
    };
  return {
    ok: true,
    valor: {
      title,
      kind,
      due_date: due_date || null,
      remind_at: aviso_dia ? `${aviso_dia}T${aviso_hora}:00` : null,
    },
  };
}

// Para rellenar el formulario: "2026-11-18T09:00:00" → día y hora por separado.
export function partirAviso(remindAt: string | null): {
  dia: string;
  hora: string;
} {
  if (!remindAt) return { dia: "", hora: "" };
  return { dia: remindAt.slice(0, 10), hora: remindAt.slice(11, 16) };
}

// "Aviso el 18 nov. a las 09:00"
export function textoAviso(remindAt: string | null): string | null {
  if (!remindAt) return null;
  const { dia, hora } = partirAviso(remindAt);
  return `Aviso el ${fechaCorta(dia)} a las ${hora}`;
}

// ---- Fechas ----

// Cuánto falta: "Hoy", "Mañana", "En 5 días", "Hace 2 días".
export function textoFalta(fecha: string, hoy: string): string {
  const dias = differenceInCalendarDays(parseISO(fecha), parseISO(hoy));
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  return dias > 1 ? `En ${dias} días` : `Hace ${-dias} días`;
}

// Orden de la lista: primero las pendientes con fecha (la más cercana arriba),
// luego las pendientes sin fecha y al final las hechas.
export function ordenarMetas<T extends Meta>(metas: T[]): T[] {
  const grupo = (m: Meta) => (m.done_at ? 2 : m.due_date ? 0 : 1);
  return [...metas].sort(
    (a, b) =>
      grupo(a) - grupo(b) ||
      (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
      a.title.localeCompare(b.title, "es"),
  );
}

// Las metas pendientes con fecha de aquí a "dias" días (y las que ya han
// pasado sin marcar), para enseñarlas en Hoy.
export function metasProximas<T extends Meta>(
  metas: T[],
  hoy: string,
  dias = 14,
): T[] {
  const hasta = sumarDias(hoy, dias);
  return ordenarMetas(
    metas.filter((m) => !m.done_at && m.due_date && m.due_date <= hasta),
  );
}
