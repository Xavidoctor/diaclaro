import { z } from "zod";
import { horaOpcional } from "./agenda";
import { esFecha, fechaCorta, sumarDias } from "./fechas";

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

// Lo que se puede cambiar de una tarea desde su ficha. Fecha, hora y minutos
// son opcionales: si los dejas vacíos, quedan vacíos (la app no se los inventa).
// La hora solo tiene sentido con fecha: con hora y minutos, la tarea ocupa
// ese rato del día y sale en la Agenda.
const esquemaTarea = z
  .object({
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
    due_time: horaOpcional,
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
  })
  .refine((d) => d.due_time === null || d.due_date !== null, {
    error: "Para poner hora, elige también el día.",
  });

// ---- Tres formas de poner una tarea ----
//   «Un día» (dia): para hacerla ese día, con hora si quieres.
//   «Con fecha límite» (limite): desde que la apuntas hasta ese día, como
//     «hacer el tema 1». Sale en Hoy cada día hasta entonces.
//   «Sin día» (sin): pendiente, sin fecha. En la base de datos, sin due_date.
export type TipoFecha = "dia" | "limite";
export type Cuando = TipoFecha | "sin";

// El tipo de una tarea tal como lo ves.
export function cuandoDeTarea(t: {
  due_date: string | null;
  due_kind?: TipoFecha;
}): Cuando {
  if (!t.due_date) return "sin";
  return t.due_kind === "limite" ? "limite" : "dia";
}

export type CambiosTarea = z.infer<typeof esquemaTarea> & {
  due_kind?: TipoFecha;
};

// Si el formulario trae «cuando», manda él: «Sin día» quita el día y la
// hora, y «Con fecha límite» necesita el día pero no lleva hora.
// Sin «cuando» (formularios que solo ponen un día), el tipo no se toca.
export function prepararCambiosTarea(datos: {
  title: unknown;
  due_date: unknown;
  due_time?: unknown;
  estimated_minutes: unknown;
  cuando?: unknown;
}): Resultado<CambiosTarea> {
  const cuando =
    datos.cuando === "dia" ||
    datos.cuando === "limite" ||
    datos.cuando === "sin"
      ? datos.cuando
      : null;
  const r = esquemaTarea.safeParse({
    title: datos.title ?? "",
    due_date: cuando === "sin" ? "" : (datos.due_date ?? ""),
    due_time:
      cuando === "sin" || cuando === "limite" ? "" : (datos.due_time ?? ""),
    estimated_minutes: datos.estimated_minutes ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  if (cuando === null) return { ok: true, valor: r.data };
  if (cuando === "dia" && !r.data.due_date)
    return { ok: false, error: "Elige qué día la vas a hacer." };
  if (cuando === "limite" && !r.data.due_date)
    return { ok: false, error: "Elige hasta qué día tienes para hacerla." };
  return {
    ok: true,
    valor: { ...r.data, due_kind: cuando === "limite" ? "limite" : "dia" },
  };
}

// "Hasta hoy", "Hasta mañana" o "Hasta el 6 nov · quedan 5 días".
export function textoFechaLimite(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hasta hoy";
  if (fecha === sumarDias(hoy, 1)) return "Hasta mañana";
  if (fecha < hoy) return `Era hasta el ${fechaCorta(fecha)}`;
  let dias = 0;
  for (let d = hoy; d < fecha && dias < 400; d = sumarDias(d, 1)) dias++;
  return `Hasta el ${fechaCorta(fecha)} · quedan ${dias} días`;
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
  due_time?: string | null;
  due_kind?: TipoFecha;
  done_at: string | null;
  created_at: string;
};

// Ordena por día y, dentro del mismo día, por hora (las que no tienen hora,
// después). Fechas "2026-10-30" y horas "09:30" se ordenan bien como texto.
export function porFechaYHora(
  a: Pick<TareaParaAgrupar, "due_date" | "due_time">,
  b: Pick<TareaParaAgrupar, "due_date" | "due_time">,
): number {
  return (
    (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
    (a.due_time ?? "99").localeCompare(b.due_time ?? "99")
  );
}

// Reparte las tareas en tres grupos, como en la pestaña Tareas.
export function agruparTareas<T extends TareaParaAgrupar>(tareas: T[]) {
  const sinPlanificar = tareas
    .filter((t) => !t.done_at && !t.due_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  // Las fechas van como "2026-10-30", así que ordenarlas como texto funciona.
  const conFecha = tareas
    .filter((t) => !t.done_at && t.due_date)
    .sort(porFechaYHora);
  const hechas = tareas
    .filter((t) => t.done_at)
    .sort((a, b) => b.done_at!.localeCompare(a.done_at!));
  return { sinPlanificar, conFecha, hechas };
}

// Dirección de la pestaña Notas con sus filtros, sin los que estén vacíos:
// { ver: "archivo", etiqueta: "ade" } → "/bandeja?ver=archivo&etiqueta=ade".
export function enlaceNotas(filtros: {
  ver?: "activas" | "archivo" | "papelera";
  q?: string;
  etiqueta?: string | null;
  tipo?: string | null;
}): string {
  const params = new URLSearchParams();
  if (filtros.ver && filtros.ver !== "activas") params.set("ver", filtros.ver);
  if (filtros.q) params.set("q", filtros.q);
  if (filtros.etiqueta) params.set("etiqueta", filtros.etiqueta);
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  const texto = params.toString();
  return texto ? `/bandeja?${texto}` : "/bandeja";
}

// Las tareas que hay que tener en cuenta hoy, para la pantalla Hoy.
// "hoy" es una fecha como "2026-10-30" (en tu zona horaria).
// Solo cuentan las pendientes; las de fecha futura entran si caen en los
// próximos `diasAviso` días, para que no te pillen por sorpresa.
export function tareasParaHoy<T extends TareaParaAgrupar>(
  tareas: T[],
  hoy: string,
  diasAviso = 3,
) {
  const pendientes = tareas.filter((t) => !t.done_at);
  const conFecha = pendientes.filter((t) => t.due_date).sort(porFechaYHora);
  const aviso = sumarDias(hoy, diasAviso);
  const esLimite = (t: T) => t.due_kind === "limite";
  const sinDia = pendientes
    .filter((t) => !t.due_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    atrasadas: conFecha.filter((t) => t.due_date! < hoy),
    // Las de hoy, y las de fecha límite que acaban hoy.
    deHoy: conFecha.filter((t) => t.due_date === hoy),
    // Con fecha límite más adelante: estás con ellas hasta ese día.
    enMarcha: conFecha.filter((t) => esLimite(t) && t.due_date! > hoy),
    proximas: conFecha.filter(
      (t) => !esLimite(t) && t.due_date! > hoy && t.due_date! <= aviso,
    ),
    // Sin día: pendientes para cuando puedas (las más nuevas primero).
    sinDia,
    sinFecha: sinDia.length,
  };
}

// Cuánto hace que tocaba una tarea que no acabaste:
// "de ayer", "de hace 3 días" o, si hace más de una semana, "del 12 oct.".
export function textoPendienteDesde(fecha: string, hoy: string): string {
  if (fecha === sumarDias(hoy, -1)) return "de ayer";
  for (let dias = 2; dias <= 7; dias++) {
    if (fecha === sumarDias(hoy, -dias)) return `de hace ${dias} días`;
  }
  return `del ${fechaCorta(fecha)}`;
}

// Las tareas apuntadas para un día concreto (las hechas, al final).
export function tareasDelDia<T extends TareaParaAgrupar>(
  tareas: T[],
  dia: string,
): T[] {
  return tareas
    .filter((t) => t.due_date === dia)
    .sort(
      (a, b) =>
        Number(Boolean(a.done_at)) - Number(Boolean(b.done_at)) ||
        porFechaYHora(a, b),
    );
}

// Los días que tienen alguna tarea sin hacer (para marcarlos en el calendario).
export function diasConTareas(tareas: TareaParaAgrupar[]): string[] {
  return [
    ...new Set(
      tareas.filter((t) => !t.done_at && t.due_date).map((t) => t.due_date!),
    ),
  ];
}

// El día al que quieres mover una tarea. Hoy o más adelante: no tiene
// sentido moverla a un día que ya ha pasado.
export function leerDiaParaMover(
  valor: unknown,
  hoy: string,
): Resultado<string> {
  if (typeof valor !== "string" || !esFecha(valor)) {
    return { ok: false, error: "Elige un día del calendario." };
  }
  if (valor < hoy) {
    return { ok: false, error: "Elige hoy o un día que aún no ha pasado." };
  }
  return { ok: true, valor };
}

// La lista de ids que llega de un formulario ("id1,id2,id3"), sin repetidos.
export function leerIds(valor: unknown): string[] {
  if (typeof valor !== "string") return [];
  return [
    ...new Set(
      valor
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
