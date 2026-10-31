import { z } from "zod";

// Enlaces de tareas, rutinas y hábitos: un podcast, una clase, un vídeo…
// Funciones puras, con pruebas en enlaces.test.ts.

export const MAX_ENLACE = 2000;

// Arregla lo que pegas para que el enlace funcione:
// "youtube.com/watch?v=1" o "www.ivoox.com/x" → con "https://" delante.
// Devuelve null si está vacío y "" si no parece un enlace.
export function normalizarEnlace(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto === "") return null;
  // Sin espacios, con un punto y sin "algo:" delante: le falta el https://.
  const conProtocolo =
    !/^[a-z][a-z0-9+.-]*:/i.test(texto) && /^[^\s/]+\.[^\s/]+/.test(texto)
      ? `https://${texto}`
      : texto;
  try {
    const url = new URL(conProtocolo);
    // Solo enlaces web normales (nunca "javascript:" ni otros raros).
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

// El campo «Enlace» de los formularios: opcional, y si hay algo, un enlace web.
export const enlaceOpcional = z
  .unknown()
  .transform(normalizarEnlace)
  .refine((v) => v !== "", {
    error: "El enlace no es válido. Cópialo entero (por ejemplo, https://…).",
  })
  .refine((v) => v === null || v.length <= MAX_ENLACE, {
    error: `El enlace es demasiado largo (como mucho ${MAX_ENLACE} caracteres).`,
  });

export type TipoEnlace = "video" | "audio" | "web";

// Sitios conocidos, para poner el dibujo y el texto del botón.
const VIDEO = ["youtube.com", "youtu.be", "vimeo.com", "twitch.tv", "tiktok.com"];
const AUDIO = [
  "spotify.com",
  "podcasts.apple.com",
  "music.apple.com",
  "ivoox.com",
  "soundcloud.com",
  "podcasts.google.com",
];

// "https://www.youtube.com/watch?v=1" → "youtube.com".
export function sitioDeEnlace(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function esDe(sitio: string, lista: string[]) {
  return lista.some((s) => sitio === s || sitio.endsWith(`.${s}`));
}

export function tipoDeEnlace(url: string): TipoEnlace {
  const sitio = sitioDeEnlace(url);
  if (esDe(sitio, AUDIO)) return "audio";
  if (esDe(sitio, VIDEO)) return "video";
  return "web";
}

// El texto del botón: «Ver vídeo», «Escuchar» o «Abrir enlace».
export function textoBotonEnlace(url: string): string {
  const tipo = tipoDeEnlace(url);
  if (tipo === "video") return "Ver vídeo";
  if (tipo === "audio") return "Escuchar";
  return "Abrir enlace";
}
