import "server-only";
import type { MensajeIA } from "./groq-tipos";

// Única parte de la app que habla con Groq (IA gratuita).
// La clave vive solo en las variables de entorno de Vercel (GROQ_API_KEY):
// nunca en el código ni en el navegador.
// La IA solo propone texto: nunca guarda nada en la base de datos.

const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
// Modelo gratuito por defecto. Se puede cambiar con GROQ_MODEL sin tocar el código
// (Groq retira modelos de vez en cuando: https://console.groq.com/docs/models).
const MODELO_POR_DEFECTO = "openai/gpt-oss-20b";

export function iaDisponible(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

// Devuelve el texto de la IA, o null si falla (sin clave, sin red, límite
// del plan gratuito agotado...). La app sigue funcionando igual sin ella.
export async function pedirTexto(
  mensajes: MensajeIA[],
): Promise<string | null> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return null;
  try {
    const respuesta = await fetch(URL_GROQ, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || MODELO_POR_DEFECTO,
        messages: mensajes,
        temperature: 0.4,
        max_completion_tokens: 1200,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!respuesta.ok) {
      console.error("Groq ha respondido con error", respuesta.status);
      return null;
    }
    const datos = (await respuesta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const texto = datos.choices?.[0]?.message?.content?.trim();
    return texto || null;
  } catch (error) {
    console.error("No se ha podido hablar con Groq", error);
    return null;
  }
}
