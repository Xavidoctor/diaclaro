import type { MensajeIA } from "./groq-tipos";
import {
  MAX_PROYECTOS_IA,
  sacarJSON,
  type ProyectoParaIA,
} from "./interpretar-texto";

// Etapa 7 (IA 1, la parte que faltaba): sugerir a qué proyecto o asignatura
// va una nota de la Bandeja. Funciones puras, con pruebas en
// sugerir-proyecto.test.ts.
//
// Solo se envía el texto de esa nota y los nombres de tus proyectos. La IA
// solo propone: la nota no cambia hasta que pulsas «Poner en …».

export const MAX_TEXTO_NOTA_IA = 1500;

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal.
Te paso una nota y la lista de proyectos y asignaturas de la persona, cada uno con un código (P1, P2...).
Elige el proyecto al que pertenece la nota, solo si encaja claramente. Si no encaja ninguno, usa null.
Explica el porqué en una frase corta en español de España.
Responde SOLO con un objeto JSON: {"proyecto":"P1","motivo":"..."} o {"proyecto":null,"motivo":"..."}`;

export function mensajesSugerirProyecto(d: {
  nota: string;
  proyectos: ProyectoParaIA[];
}): MensajeIA[] {
  const proyectos = d.proyectos
    .slice(0, MAX_PROYECTOS_IA)
    .map((p, i) => `P${i + 1}: ${p.nombre} (área ${p.area})`)
    .join("\n");
  return [
    { role: "system", content: INSTRUCCIONES },
    {
      role: "user",
      content: [
        `Proyectos:\n${proyectos}`,
        `Nota:\n"""${d.nota.slice(0, MAX_TEXTO_NOTA_IA)}"""`,
      ].join("\n\n"),
    },
  ];
}

export type Sugerencia = {
  proyecto: ProyectoParaIA | null; // null = no encaja en ninguno
  motivo: string | null;
};

// Lee la respuesta. Un código que no está en la lista cuenta como «ninguno»:
// la IA no puede inventarse un proyecto. Si no se entiende nada, null.
export function leerSugerencia(
  respuesta: string,
  proyectos: ProyectoParaIA[],
): Sugerencia | null {
  const datos = sacarJSON(respuesta);
  if (!datos || typeof datos !== "object" || !("proyecto" in datos))
    return null;
  const { proyecto, motivo } = datos as { proyecto: unknown; motivo: unknown };
  const codigo =
    typeof proyecto === "string" ? /^P(\d+)$/i.exec(proyecto.trim()) : null;
  const indice = codigo ? Number(codigo[1]) - 1 : -1;
  const elegido =
    indice >= 0 && indice < Math.min(proyectos.length, MAX_PROYECTOS_IA)
      ? proyectos[indice]
      : null;
  return {
    proyecto: elegido,
    motivo:
      typeof motivo === "string" && motivo.trim()
        ? motivo.trim().slice(0, 200)
        : null,
  };
}
