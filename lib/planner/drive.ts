// Reglas para enlazar documentos de Google Drive. Funciones puras, con
// pruebas en drive.test.ts. DíaClaro no lee lo que hay dentro de los
// documentos: solo guarda su nombre y su enlace.

export type DocumentoElegido = {
  drive_file_id: string;
  title: string;
  url: string;
  mime_type: string | null;
};

export const MAX_DOCUMENTOS_DE_GOLPE = 20;

const ID_DRIVE = /^[\w-]{1,200}$/;
// Solo enlaces de Google: así nadie puede colar otro tipo de enlace.
const URL_GOOGLE = /^https:\/\/(docs|drive)\.google\.com\//;

// Comprueba lo que devuelve el selector de Google antes de guardarlo.
// Lo que no cuadra se descarta sin más.
export function prepararDocumentos(entrada: unknown): DocumentoElegido[] {
  if (!Array.isArray(entrada)) return [];
  const vistos = new Set<string>();
  const resultado: DocumentoElegido[] = [];
  for (const d of entrada.slice(0, MAX_DOCUMENTOS_DE_GOLPE)) {
    if (!d || typeof d !== "object") continue;
    const { id, name, url, mimeType } = d as Record<string, unknown>;
    if (typeof id !== "string" || !ID_DRIVE.test(id) || vistos.has(id))
      continue;
    if (typeof url !== "string" || url.length > 2000 || !URL_GOOGLE.test(url))
      continue;
    const titulo = typeof name === "string" ? name.trim().slice(0, 500) : "";
    vistos.add(id);
    resultado.push({
      drive_file_id: id,
      title: titulo || "Documento sin nombre",
      url,
      mime_type:
        typeof mimeType === "string" && mimeType.length <= 200
          ? mimeType
          : null,
    });
  }
  return resultado;
}

// "Documento", "Hoja de cálculo"... a partir del tipo de archivo de Google.
export function tipoDocumento(mime: string | null): string {
  if (!mime) return "Archivo";
  if (mime.endsWith(".document")) return "Documento";
  if (mime.endsWith(".spreadsheet")) return "Hoja de cálculo";
  if (mime.endsWith(".presentation")) return "Presentación";
  if (mime.endsWith(".folder")) return "Carpeta";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Imagen";
  return "Archivo";
}

// A dónde volver después de conectar con Google: solo direcciones de la app.
export function direccionDeVuelta(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!/^\/[\w\-/]*$/.test(valor) || valor.startsWith("//")) return null;
  return valor.slice(0, 300);
}
