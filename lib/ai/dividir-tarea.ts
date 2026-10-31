import type { MensajeIA } from "./groq-tipos";
import { sacarJSON } from "./interpretar-texto";

// «Divide esta tarea en pasos»: la IA propone pasos pequeños para poder
// empezar una tarea que se hace bola. Funciones puras, con pruebas en
// dividir-tarea.test.ts.
//
// Solo se envía el título y la descripción de esa tarea. La IA solo propone:
// nada se guarda hasta que tú revisas los pasos y pulsas «Guardar pasos».
// La IA no pone fechas, horas ni minutos: eso lo decides tú.

export const MAX_TEXTO_TAREA_IA = 1000;
export const MIN_PASOS = 2;
export const MAX_PASOS = 6;
const MAX_LETRAS_PASO = 120;

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal.
Te paso una tarea que a la persona le cuesta empezar. Divídela en entre ${MIN_PASOS} y ${MAX_PASOS} pasos concretos, en orden.
Reglas:
- El primer paso tiene que ser muy pequeño y fácil, algo que se pueda hacer ya (por ejemplo, abrir el documento o buscar el papel).
- Cada paso empieza con un verbo y tiene menos de 12 palabras.
- No pongas fechas, horas, minutos ni duraciones.
- No inventes datos que no estén en la tarea (nombres, lugares, cantidades).
- Si la tarea ya es un solo gesto sencillo, devuelve una lista vacía.
Escribe en español de España.
Responde SOLO con un objeto JSON: {"pasos":["...","..."]}`;

export function mensajesDividirTarea(d: {
  titulo: string;
  detalles: string | null;
}): MensajeIA[] {
  const texto = [d.titulo, d.detalles].filter(Boolean).join("\n");
  return [
    { role: "system", content: INSTRUCCIONES },
    {
      role: "user",
      content: `Tarea:\n"""${texto.slice(0, MAX_TEXTO_TAREA_IA)}"""`,
    },
  ];
}

// Lee la respuesta y la limpia: quita números del principio («1.», «2)»),
// pasos vacíos o repetidos, y deja como mucho MAX_PASOS. Si la IA cree que
// no hace falta dividir, devuelve []. Si no se entiende nada, null.
export function leerPasos(respuesta: string): string[] | null {
  const datos = sacarJSON(respuesta) as { pasos?: unknown } | null;
  if (!datos || !Array.isArray(datos.pasos)) return null;
  const vistos = new Set<string>();
  const pasos: string[] = [];
  for (const paso of datos.pasos) {
    if (typeof paso !== "string") continue;
    const limpio = limpiarPaso(paso);
    const clave = limpio.toLocaleLowerCase("es-ES");
    if (!limpio || vistos.has(clave)) continue;
    vistos.add(clave);
    pasos.push(limpio);
    if (pasos.length === MAX_PASOS) break;
  }
  return pasos.length < MIN_PASOS ? [] : pasos;
}

function limpiarPaso(paso: string): string {
  return paso
    .replace(/^\s*(\d+\s*[.)\-:]|[-•*])\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LETRAS_PASO);
}
