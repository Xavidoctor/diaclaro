// Reglas de «Documentos importantes» (DNI, billetes, entradas…).
// Funciones puras, con pruebas en documentos-importantes.test.ts.
// Los archivos se guardan en TU Google Drive, en una carpeta de DíaClaro.
// DíaClaro no copia nada en su base de datos: el tipo va guardado en el
// propio archivo de Drive (en sus "appProperties").

export const TIPOS_IMPORTANTES = [
  { id: "identidad", nombre: "DNI e identidad" },
  { id: "viajes", nombre: "Billetes y viajes" },
  { id: "entradas", nombre: "Entradas" },
  { id: "salud", nombre: "Salud" },
  { id: "otros", nombre: "Otros" },
] as const;

export type TipoImportante = (typeof TIPOS_IMPORTANTES)[number]["id"];

// Las marcas con las que DíaClaro reconoce sus archivos y su carpeta en Drive.
export const MARCA = "diaclaro";
export const MARCA_DOCUMENTO = "importante";
export const MARCA_CARPETA = "carpeta-importantes";
export const NOMBRE_CARPETA = "DíaClaro · Documentos importantes";

// Al subir desde la app, el archivo va directo del móvil a Drive.
export const MAX_MB_SUBIR = 20;
// Al compartir desde la galería pasa por el servidor de Vercel, que acepta menos.
export const MAX_MB_COMPARTIR = 4;
export const MAX_COMPARTIR_DE_GOLPE = 5;

export function leerTipo(valor: unknown): TipoImportante {
  return TIPOS_IMPORTANTES.find((t) => t.id === valor)?.id ?? "otros";
}

export function nombreTipo(tipo: TipoImportante): string {
  return TIPOS_IMPORTANTES.find((t) => t.id === tipo)?.nombre ?? "Otros";
}

export type ArchivoParaSubir = { name: string; type: string; size: number };

// Solo fotos y PDF, y sin pasarse de tamaño.
export function comprobarArchivo(
  archivo: ArchivoParaSubir,
  maxMb: number,
): { ok: true } | { ok: false; mensaje: string } {
  const valido =
    archivo.type.startsWith("image/") || archivo.type === "application/pdf";
  if (!valido)
    return { ok: false, mensaje: "Solo se pueden guardar fotos y PDF." };
  if (archivo.size === 0)
    return { ok: false, mensaje: "El archivo está vacío." };
  if (archivo.size > maxMb * 1024 * 1024)
    return {
      ok: false,
      mensaje: `El archivo es muy grande. Como mucho, ${maxMb} MB.`,
    };
  return { ok: true };
}

// El nombre con el que se guarda en Drive. Si escribes uno, se usa ese
// (con la extensión del archivo original); si no, el del archivo.
export function nombreParaGuardar(titulo: string, original: string): string {
  const base = original.split(/[/\\]/).pop()?.trim() || "documento";
  const limpio = titulo
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, 200);
  if (!limpio) return base.slice(0, 200);
  const extension = /\.[a-z0-9]{1,5}$/i.exec(base)?.[0] ?? "";
  if (!extension || limpio.toLowerCase().endsWith(extension.toLowerCase()))
    return limpio;
  return `${limpio}${extension}`;
}

// Los datos que acompañan al archivo al subirlo a Drive.
export function metadatosSubida(datos: {
  nombre: string;
  tipo: TipoImportante;
  carpeta: string;
}) {
  return {
    name: datos.nombre,
    parents: [datos.carpeta],
    appProperties: { [MARCA]: MARCA_DOCUMENTO, tipo: datos.tipo },
  };
}

export const URL_SUBIDA_DRIVE =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";

// Drive pide el archivo y sus datos juntos, en un formato llamado
// "multipart/related". Sirve tanto en el navegador como en el servidor.
export function cuerpoSubida(
  metadatos: ReturnType<typeof metadatosSubida>,
  archivo: Blob,
  tipoArchivo: string,
): { cuerpo: Blob; tipoContenido: string } {
  const limite = `diaclaro${Math.random().toString(36).slice(2)}`;
  const cuerpo = new Blob([
    `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadatos),
    `\r\n--${limite}\r\nContent-Type: ${tipoArchivo}\r\n\r\n`,
    archivo,
    `\r\n--${limite}--`,
  ]);
  return { cuerpo, tipoContenido: `multipart/related; boundary=${limite}` };
}

export type DocumentoImportante = {
  id: string;
  nombre: string;
  tipo: TipoImportante;
  mime: string;
  enlace: string;
  miniatura: string | null;
  creado: string; // fecha y hora en que lo guardaste
};

const ID_DRIVE = /^[\w-]{1,200}$/;
const URL_DRIVE = /^https:\/\/(docs|drive)\.google\.com\//;
const URL_MINIATURA = /^https:\/\/[\w-]+\.googleusercontent\.com\//;

// Comprueba lo que devuelve Drive antes de enseñarlo. Lo que no cuadra se salta.
export function leerDocumentoDrive(f: unknown): DocumentoImportante | null {
  if (!f || typeof f !== "object") return null;
  const { id, name, mimeType, webViewLink, thumbnailLink, createdTime } =
    f as Record<string, unknown>;
  const propiedades = (f as { appProperties?: Record<string, unknown> })
    .appProperties;
  if (typeof id !== "string" || !ID_DRIVE.test(id)) return null;
  if (typeof webViewLink !== "string" || !URL_DRIVE.test(webViewLink))
    return null;
  return {
    id,
    nombre:
      typeof name === "string" && name.trim() ? name.trim() : "Sin nombre",
    tipo: leerTipo(propiedades?.tipo),
    mime: typeof mimeType === "string" ? mimeType : "",
    enlace: webViewLink,
    miniatura:
      typeof thumbnailLink === "string" && URL_MINIATURA.test(thumbnailLink)
        ? thumbnailLink
        : null,
    creado: typeof createdTime === "string" ? createdTime : "",
  };
}

// Quita tildes y mayúsculas para buscar "dni" y encontrar "DNI", o
// "billete" y encontrar "Billete de avión".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function filtrarDocumentos(
  documentos: DocumentoImportante[],
  filtro: { busqueda?: string; tipo?: string },
): DocumentoImportante[] {
  const palabras = normalizar(filtro.busqueda ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const tipo = TIPOS_IMPORTANTES.some((t) => t.id === filtro.tipo)
    ? filtro.tipo
    : null;
  return documentos.filter((d) => {
    if (tipo && d.tipo !== tipo) return false;
    const texto = normalizar(`${d.nombre} ${nombreTipo(d.tipo)}`);
    return palabras.every((p) => texto.includes(p));
  });
}
