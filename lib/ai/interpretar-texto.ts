import { z } from "zod";
import type { MensajeIA } from "./groq-tipos";
import { CODIGOS, type CodigoDia } from "../planner/agenda";
import { diasDesde, esFecha, nombreDia, sumarDias } from "../planner/fechas";
import { TIPOS_META, type TipoMeta } from "../planner/metas";

// Tu asistente: escribes lo que tienes en la cabeza y la IA lo ordena en
// notas, tareas, citas, rutinas, hábitos y metas. Funciones puras, con pruebas en interpretar-texto.test.ts.
//
// La IA solo PROPONE: nada se guarda hasta que tú lo revisas y pulsas
// «Guardar». Y nunca se inventa un día, una hora ni una duración: la IA tiene
// que copiar el trozo de tu texto donde lo dices. Si ese trozo no está en lo
// que escribiste, la app lo borra de la propuesta y te avisa.

export const MAX_TEXTO_IA = 2000;
export const MAX_PROPUESTAS = 10;
export const MAX_PROYECTOS_IA = 60;
const DIAS_CALENDARIO = 21; // días que le damos a la IA para no equivocarse

export const TIPOS_PROPUESTA = [
  "tarea",
  "nota",
  "cita",
  "rutina",
  "habito",
  "meta",
] as const;
export type TipoPropuesta = (typeof TIPOS_PROPUESTA)[number];

export type ProyectoParaIA = { id: string; nombre: string; area: string };

export type Propuesta = {
  tipo: TipoPropuesta;
  titulo: string;
  detalle: string | null;
  fecha: string | null; // "2026-11-03"
  hora: string | null; // "16:00" (solo en citas)
  minutos: number | null;
  proyectoId: string | null; // en tareas y metas
  // Qué días toca (rutinas y hábitos): "todos", unos días concretos, o null
  // si no lo has dicho (entonces lo eliges tú al revisar).
  dias: "todos" | CodigoDia[] | null;
  claseMeta: TipoMeta | null; // solo en metas: meta, entrega o examen
  avisos: string[]; // lo que la app ha quitado o cambiado, para que lo veas
};

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal en español.
La persona escribe lo que tiene en la cabeza. Sepáralo en elementos y clasifica cada uno:
- "tarea": algo que tiene que hacer.
- "cita": algo con día fijo en el que tiene que estar (clase, tutoría, médico, entrevista).
- "nota": una idea, un dato o algo para recordar que no es una acción.
- "rutina": algo que se repite con horario ("cada mañana paseo al perro", "los lunes gimnasio a las 7").
- "habito": algo que quiere hacer más a menudo y seguir con el tiempo ("quiero leer más", "beber agua cada día").
- "meta": una entrega, un examen o un objetivo de un proyecto ("examen de Estadística el 18").
Reglas muy importantes:
- No inventes nada. Si la persona no dice el día, la hora o cuánto tarda, deja ese campo en null.
- Cuando rellenes "fecha", "hora" o "minutos", copia en "fecha_texto", "hora_texto" o "minutos_texto" las palabras EXACTAS del texto donde lo dice (por ejemplo "el jueves", "a las 5", "2 horas").
- "dias" (solo rutinas y hábitos): "todos" o una lista de códigos MO, TU, WE, TH, FR, SA, SU. Copia en "dias_texto" las palabras exactas ("cada día", "los lunes y miércoles"). Si no lo dice, null.
- "clase_meta" (solo metas): "entrega", "examen" o "meta".
- Para pasar días de la semana a fechas usa SOLO el calendario que te doy.
- "proyecto" (tareas y metas) solo puede ser uno de los códigos de la lista (P1, P2...) y solo si encaja claramente. Si no, null.
- "titulo" corto, en infinitivo para las tareas ("Entregar práctica de Matemáticas"), sin la fecha.
- Como mucho ${MAX_PROPUESTAS} elementos.
Responde SOLO con un objeto JSON con esta forma:
{"elementos":[{"tipo":"tarea","titulo":"...","detalle":null,"fecha":null,"fecha_texto":null,"hora":null,"hora_texto":null,"minutos":null,"minutos_texto":null,"dias":null,"dias_texto":null,"clase_meta":null,"proyecto":null}]}`;

// Lo que se le manda a la IA: tu texto, el calendario de los próximos días y
// los nombres de tus proyectos (nada más: ni notas, ni tareas, ni hábitos).
export function mensajesInterpretar(d: {
  texto: string;
  hoy: string;
  proyectos: ProyectoParaIA[];
}): MensajeIA[] {
  const calendario = diasDesde(d.hoy, DIAS_CALENDARIO)
    .map((dia, i) => `${dia} = ${nombreDia(dia)}${i === 0 ? " (hoy)" : ""}`)
    .join("\n");
  const proyectos = d.proyectos
    .slice(0, MAX_PROYECTOS_IA)
    .map((p, i) => `P${i + 1}: ${p.nombre} (área ${p.area})`)
    .join("\n");
  return [
    { role: "system", content: INSTRUCCIONES },
    {
      role: "user",
      content: [
        `Calendario:\n${calendario}`,
        `Proyectos:\n${proyectos || "(ninguno)"}`,
        `Texto:\n"""${d.texto.slice(0, MAX_TEXTO_IA)}"""`,
      ].join("\n\n"),
    },
  ];
}

// ---- Leer la respuesta ----

// .optional(): si la IA se olvida de un campo, cuenta como vacío.
const textoONulo = z
  .unknown()
  .optional()
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null));
const numeroONulo = z
  .unknown()
  .optional()
  .transform((v) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null,
  );

const esquemaElemento = z.object({
  tipo: z.enum(TIPOS_PROPUESTA).catch("nota"),
  titulo: textoONulo,
  detalle: textoONulo,
  fecha: textoONulo,
  fecha_texto: textoONulo,
  hora: textoONulo,
  hora_texto: textoONulo,
  minutos: numeroONulo,
  minutos_texto: textoONulo,
  dias: z.unknown().optional(),
  dias_texto: textoONulo,
  clase_meta: z.enum(TIPOS_META).nullable().catch(null),
  proyecto: textoONulo,
});

// "todos", una lista de días válida, o null si no se entiende.
function leerDias(valor: unknown): "todos" | CodigoDia[] | null {
  if (valor === "todos") return "todos";
  if (!Array.isArray(valor)) return null;
  const dias = CODIGOS.filter((c) => valor.includes(c));
  if (dias.length === 0) return null;
  return dias.length === CODIGOS.length ? "todos" : dias;
}

// Qué datos lleva cada tipo (lo demás se quita).
const LLEVA = {
  tarea: {
    fecha: true,
    hora: false,
    minutos: true,
    proyecto: true,
    dias: false,
  },
  nota: {
    fecha: false,
    hora: false,
    minutos: false,
    proyecto: false,
    dias: false,
  },
  cita: {
    fecha: true,
    hora: true,
    minutos: true,
    proyecto: false,
    dias: false,
  },
  rutina: {
    fecha: false,
    hora: true,
    minutos: true,
    proyecto: false,
    dias: true,
  },
  habito: {
    fecha: false,
    hora: false,
    minutos: false,
    proyecto: false,
    dias: true,
  },
  meta: {
    fecha: true,
    hora: false,
    minutos: false,
    proyecto: true,
    dias: false,
  },
} satisfies Record<TipoPropuesta, Record<string, boolean>>;

// Minúsculas, sin tildes y con un solo espacio: así "Jueves" y "jueves"
// cuentan como la misma palabra.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ¿Lo que dice la IA está de verdad en tu texto?
export function estaEnTexto(trozo: string | null, texto: string): boolean {
  if (!trozo) return false;
  const t = normalizar(trozo);
  return t.length >= 2 && normalizar(texto).includes(t);
}

// La IA a veces envuelve el JSON en ```json ... ```: nos quedamos con el objeto.
export function sacarJSON(respuesta: string): unknown {
  const inicio = respuesta.indexOf("{");
  const fin = respuesta.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(respuesta.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

const HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// Convierte la respuesta de la IA en propuestas revisadas por la app.
// Devuelve null si la respuesta no se entiende.
export function leerRespuesta(
  respuesta: string,
  d: { texto: string; hoy: string; proyectos: ProyectoParaIA[] },
): Propuesta[] | null {
  const datos = sacarJSON(respuesta) as { elementos?: unknown } | null;
  if (!datos || !Array.isArray(datos.elementos)) return null;

  const proyectos = d.proyectos.slice(0, MAX_PROYECTOS_IA);
  const limite = sumarDias(d.hoy, 366);
  const propuestas: Propuesta[] = [];

  for (const bruto of datos.elementos.slice(0, MAX_PROPUESTAS)) {
    const r = esquemaElemento.safeParse(bruto ?? {});
    if (!r.success || !r.data.titulo) continue;
    const e = r.data;
    const titulo = r.data.titulo;
    const avisos: string[] = [];

    let fecha: string | null = null;
    if (e.fecha) {
      if (!estaEnTexto(e.fecha_texto, d.texto))
        avisos.push("He quitado el día: no lo veo en lo que escribiste.");
      else if (!esFecha(e.fecha) || e.fecha < d.hoy || e.fecha > limite)
        avisos.push("He quitado el día: no era una fecha válida.");
      else fecha = e.fecha;
    }

    let hora: string | null = null;
    if (e.hora) {
      const m = HORA.exec(e.hora);
      if (!estaEnTexto(e.hora_texto, d.texto) || !/\d/.test(e.hora_texto!))
        avisos.push("He quitado la hora: no la veo en lo que escribiste.");
      else if (!m) avisos.push("He quitado la hora: no era válida.");
      else hora = `${m[1].padStart(2, "0")}:${m[2]}`;
    }

    let minutos: number | null = null;
    if (e.minutos !== null) {
      if (!estaEnTexto(e.minutos_texto, d.texto))
        avisos.push("He quitado la duración: no la veo en lo que escribiste.");
      else if (e.minutos < 1 || e.minutos > 1440)
        avisos.push("He quitado la duración: no era válida.");
      else minutos = e.minutos;
    }

    let tipo = e.tipo;
    // Una cita sin día no se puede poner en la agenda: queda como tarea.
    if (tipo === "cita" && !fecha) {
      tipo = "tarea";
      avisos.push("Sin un día claro no va a la agenda: la dejo como tarea.");
    }

    let dias: Propuesta["dias"] = null;
    if (LLEVA[tipo].dias && e.dias !== null && e.dias !== undefined) {
      if (!estaEnTexto(e.dias_texto, d.texto))
        avisos.push("He quitado los días: no los veo en lo que escribiste.");
      else dias = leerDias(e.dias);
    }

    const codigo = /^P(\d+)$/i.exec(e.proyecto ?? "");
    const proyecto = codigo ? proyectos[Number(codigo[1]) - 1] : undefined;
    const lleva = LLEVA[tipo];

    propuestas.push({
      tipo,
      titulo: titulo.slice(0, 200),
      detalle: e.detalle?.slice(0, 2000) ?? null,
      fecha: lleva.fecha ? fecha : null,
      hora: lleva.hora ? hora : null,
      minutos: lleva.minutos ? minutos : null,
      proyectoId: lleva.proyecto ? (proyecto?.id ?? null) : null,
      dias,
      claseMeta: tipo === "meta" ? (e.clase_meta ?? "meta") : null,
      avisos,
    });
  }
  return propuestas;
}
