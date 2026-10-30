import type { MensajeIA } from "./groq-tipos";
import { sacarJSON } from "./interpretar-texto";
import {
  MAX_LARGO_FRASE,
  NOMBRE_DIRECCION,
  type Direccion,
} from "../planner/habitos";

// Ideas de frases para motivarte con un hábito. Funciones puras, con pruebas
// en frases-habito.test.ts.
//
// Solo se envía el nombre del hábito y lo que quieres (más, menos o verlo).
// Nunca lo que apuntas, ni tus notas, ni tus metas. La IA solo propone:
// una frase se guarda cuando tú pulsas «Guardar».

export const FRASES_POR_PETICION = 5;

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal.
La persona sigue un hábito y quiere frases cortas para motivarse cuando le llegue un recordatorio.
Escribe ${FRASES_POR_PETICION} frases distintas en español de España, hablando de tú, de como mucho 100 caracteres cada una.
Tono amable, cercano y realista, como un buen amigo. Nada de culpa, sermones, amenazas, consejos médicos ni promesas exageradas.
Sin comillas, sin emojis y sin hashtags.
Responde SOLO con un objeto JSON: {"frases":["...","..."]}`;

export function mensajesFrasesHabito(h: {
  titulo: string;
  direccion: Direccion;
}): MensajeIA[] {
  return [
    { role: "system", content: INSTRUCCIONES },
    {
      role: "user",
      content: `Hábito: ${h.titulo.slice(0, 100)}\nLo que quiere: ${NOMBRE_DIRECCION[h.direccion]}`,
    },
  ];
}

// Lee las frases de la respuesta: quita comillas, vacías, largas y repetidas.
// Si no se entiende nada, null.
export function leerFrases(respuesta: string): string[] | null {
  const datos = sacarJSON(respuesta);
  if (!datos || typeof datos !== "object" || !("frases" in datos)) return null;
  const { frases } = datos as { frases: unknown };
  if (!Array.isArray(frases)) return null;
  const limpias = frases
    .filter((f): f is string => typeof f === "string")
    .map((f) =>
      f
        .trim()
        .replace(/^["'«“]+|["'»”]+$/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((f) => f.length > 0 && f.length <= MAX_LARGO_FRASE);
  // Si se repite (sin mirar mayúsculas), se queda la primera.
  const unicas = limpias.filter(
    (f, i) =>
      limpias.findIndex((g) => g.toLowerCase() === f.toLowerCase()) === i,
  );
  return unicas.length > 0 ? unicas.slice(0, FRASES_POR_PETICION) : null;
}
