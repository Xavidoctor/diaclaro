import { z } from "zod";

// Reglas de la Bandeja. Son funciones puras: no tocan la base de datos,
// así que se pueden probar con `npm test`.

export const MAX_TEXTO_NOTA = 10000;
export const MAX_TITULO_TAREA = 500;
const LARGO_TITULO_DESDE_NOTA = 120;

// Lo que llega del cuadro de captura.
const esquemaCaptura = z
  .string({ error: "Escribe algo para guardarlo." })
  .trim()
  .min(1, "Escribe algo para guardarlo.")
  .max(MAX_TEXTO_NOTA, `Como mucho ${MAX_TEXTO_NOTA} caracteres.`);

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; error: string };

// Comprueba el texto capturado y busca un enlace dentro.
export function prepararCaptura(
  valor: unknown,
): Resultado<{ texto: string; url: string | null }> {
  const r = esquemaCaptura.safeParse(valor);
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: { texto: r.data, url: primerEnlace(r.data) } };
}

// Devuelve el primer enlace (http o https) que aparezca en el texto.
export function primerEnlace(texto: string): string | null {
  const encontrado = texto.match(/https?:\/\/[^\s<>"]+/i);
  if (!encontrado) return null;
  // Quita signos de puntuación pegados al final: "mira https://x.com." → sin el punto.
  return encontrado[0].replace(/[.,;:!?)\]]+$/, "");
}

// Título de la tarea que sale de una nota: su primera línea con texto,
// recortada por una palabra entera si es muy larga.
export function tituloDesdeNota(texto: string): string {
  const primeraLinea =
    texto
      .split("\n")
      .map((linea) => linea.trim())
      .find((linea) => linea.length > 0) ?? "";
  if (primeraLinea.length <= LARGO_TITULO_DESDE_NOTA) return primeraLinea;

  const recorte = primeraLinea.slice(0, LARGO_TITULO_DESDE_NOTA);
  const ultimoEspacio = recorte.lastIndexOf(" ");
  const base = ultimoEspacio > 40 ? recorte.slice(0, ultimoEspacio) : recorte;
  return `${base.trimEnd()}…`;
}

// Al convertir una nota en tarea: el título es la primera línea y, si la nota
// tiene más texto, el texto completo se copia en los detalles. La nota no se toca.
export function tareaDesdeNota(texto: string): {
  title: string;
  details: string | null;
} {
  const title = tituloDesdeNota(texto);
  const details = texto.trim() === title ? null : texto.trim();
  return { title, details };
}

// Lo que se puede cambiar de una tarea desde su ficha. Fecha y minutos son
// opcionales: si los dejas vacíos, quedan vacíos (la app no se los inventa).
const esquemaTarea = z.object({
  title: z
    .string()
    .trim()
    .min(1, "La tarea necesita un título.")
    .max(
      MAX_TITULO_TAREA,
      `El título admite como mucho ${MAX_TITULO_TAREA} caracteres.`,
    ),
  due_date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date({ error: "La fecha no es válida." }).nullable()),
  estimated_minutes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(
      z
        .number({ error: "Los minutos tienen que ser un número." })
        .int("Los minutos tienen que ser un número entero.")
        .min(1, "Pon al menos 1 minuto, o déjalo vacío.")
        .max(1440, "Como mucho 1440 minutos (un día).")
        .nullable(),
    ),
});

export type CambiosTarea = z.infer<typeof esquemaTarea>;

export function prepararCambiosTarea(datos: {
  title: unknown;
  due_date: unknown;
  estimated_minutes: unknown;
}): Resultado<CambiosTarea> {
  const r = esquemaTarea.safeParse({
    title: datos.title ?? "",
    due_date: datos.due_date ?? "",
    estimated_minutes: datos.estimated_minutes ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}

// Texto del buscador: sin espacios de sobra y con un límite razonable.
export function limpiarBusqueda(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.trim().replace(/\s+/g, " ").slice(0, 100);
}

// Las fijadas arriba; dentro de cada grupo, la más nueva primero.
export function ordenarNotas<T extends { pinned: boolean; created_at: string }>(
  notas: T[],
): T[] {
  return [...notas].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

type TareaParaAgrupar = {
  due_date: string | null;
  done_at: string | null;
  created_at: string;
};

// Reparte las tareas en tres grupos, como en la pestaña Tareas.
export function agruparTareas<T extends TareaParaAgrupar>(tareas: T[]) {
  const sinPlanificar = tareas
    .filter((t) => !t.done_at && !t.due_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  // Las fechas van como "2026-10-30", así que ordenarlas como texto funciona.
  const conFecha = tareas
    .filter((t) => !t.done_at && t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const hechas = tareas
    .filter((t) => t.done_at)
    .sort((a, b) => b.done_at!.localeCompare(a.done_at!));
  return { sinPlanificar, conFecha, hechas };
}
