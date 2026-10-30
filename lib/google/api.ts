import "server-only";
import {
  MARCA,
  MARCA_CARPETA,
  MARCA_DOCUMENTO,
  NOMBRE_CARPETA,
  URL_SUBIDA_DRIVE,
  type TipoImportante,
} from "@/lib/planner/documentos-importantes";
import type { EventoGoogle } from "@/lib/planner/google-calendar";

// Única parte de la app que habla con Google.
// Las claves viven solo en las variables de entorno de Vercel
// (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET): nunca en el código ni en el navegador.
// Solo se pide permiso para LEER el calendario: DíaClaro no puede cambiarlo.

const URL_PERMISO = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_REVOCAR = "https://oauth2.googleapis.com/revoke";
const URL_CALENDARIO = "https://www.googleapis.com/calendar/v3";

export const PERMISO_CALENDARIO =
  "https://www.googleapis.com/auth/calendar.readonly";
// Drive con "drive.file": solo los archivos que eliges tú en el selector de
// Google. DíaClaro no ve el resto de tu Drive.
export const PERMISO_DRIVE = "https://www.googleapis.com/auth/drive.file";
// "openid email" sirve para enseñarte con qué cuenta de Google conectaste.
const PERMISOS = `openid email ${PERMISO_CALENDARIO}`;

// Como mucho se leen 10 calendarios, para que la página no tarde.
const MAX_CALENDARIOS = 10;

export function googleDisponible(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

// El selector de archivos de Google necesita además una clave de API
// (pública, limitada a la web de DíaClaro) en GOOGLE_PICKER_API_KEY.
export function selectorDriveDisponible(): boolean {
  return googleDisponible() && Boolean(process.env.GOOGLE_PICKER_API_KEY);
}

// Lo que el navegador necesita para abrir el selector. El número de proyecto
// de Google Cloud es el principio del ID de cliente ("12345-abc...").
export function datosSelectorDrive() {
  return {
    claveApi: process.env.GOOGLE_PICKER_API_KEY ?? "",
    idApp: (process.env.GOOGLE_CLIENT_ID ?? "").split("-")[0],
  };
}

export function secretoGoogle(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

// La dirección de Google donde aceptas darle permiso a DíaClaro.
export function urlParaConectar(
  estado: string,
  vuelta: string,
  conDrive = false,
): string {
  const url = new URL(URL_PERMISO);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: vuelta,
    response_type: "code",
    scope: conDrive ? `${PERMISOS} ${PERMISO_DRIVE}` : PERMISOS,
    // Mantiene los permisos que ya diste (por ejemplo, el calendario al añadir Drive).
    include_granted_scopes: "true",
    // "offline" + "consent": Google nos da un permiso duradero (refresh token)
    // para leer el calendario sin pedirte que aceptes cada vez.
    access_type: "offline",
    prompt: "consent",
    state: estado,
  }).toString();
  return url.toString();
}

export type Conexion =
  | { ok: true; permiso: string; email: string | null; drive: boolean }
  | { ok: false; motivo: "sin-permiso-calendario" | "fallo" };

// Cuando vuelves de Google, cambia el código de un solo uso por el permiso.
export async function canjearCodigo(
  codigo: string,
  vuelta: string,
): Promise<Conexion> {
  try {
    const respuesta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: codigo,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: secretoGoogle(),
        redirect_uri: vuelta,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) {
      console.error("Google no ha aceptado el código", respuesta.status);
      return { ok: false, motivo: "fallo" };
    }
    const datos = (await respuesta.json()) as {
      refresh_token?: string;
      scope?: string;
      id_token?: string;
    };
    // Google deja quitar la casilla del calendario al aceptar: lo comprobamos.
    const permisos = datos.scope?.split(" ") ?? [];
    if (!permisos.includes(PERMISO_CALENDARIO)) {
      return { ok: false, motivo: "sin-permiso-calendario" };
    }
    if (!datos.refresh_token) return { ok: false, motivo: "fallo" };
    return {
      ok: true,
      permiso: datos.refresh_token,
      email: emailDelToken(datos.id_token),
      drive: permisos.includes(PERMISO_DRIVE),
    };
  } catch (error) {
    console.error("No se ha podido hablar con Google", error);
    return { ok: false, motivo: "fallo" };
  }
}

// El id_token viene directamente de Google por una conexión segura,
// así que basta con leer el correo que lleva dentro.
function emailDelToken(idToken: string | undefined): string | null {
  const partes = idToken?.split(".");
  if (!partes || partes.length < 2) return null;
  try {
    const datos = JSON.parse(
      Buffer.from(partes[1], "base64url").toString("utf8"),
    ) as { email?: unknown };
    return typeof datos.email === "string" ? datos.email : null;
  } catch {
    return null;
  }
}

export type LecturaGoogle =
  | { ok: true; eventos: EventoGoogle[] }
  | { ok: false; motivo: "permiso-retirado" | "fallo" };

// Lee los eventos de tus calendarios visibles entre dos instantes.
export async function leerEventos(
  permiso: string,
  desde: Date,
  hasta: Date,
): Promise<LecturaGoogle> {
  try {
    const acceso = await pedirAcceso(permiso);
    if (!acceso.ok) return acceso;
    const calendarios = await listarCalendarios(acceso.token);
    const listas = await Promise.all(
      calendarios.map((id) => eventosDe(acceso.token, id, desde, hasta)),
    );
    return { ok: true, eventos: listas.flat() };
  } catch (error) {
    console.error("No se ha podido leer Google Calendar", error);
    return { ok: false, motivo: "fallo" };
  }
}

// Con el permiso duradero se pide un pase de acceso que dura una hora.
async function pedirAcceso(
  permiso: string,
  soloPermiso?: string,
): Promise<
  | { ok: true; token: string }
  | { ok: false; motivo: "permiso-retirado" | "fallo" }
> {
  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: permiso,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: secretoGoogle(),
      grant_type: "refresh_token",
      // Si se pide, el pase solo sirve para ese permiso (por ejemplo, solo Drive).
      ...(soloPermiso ? { scope: soloPermiso } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as {
      error?: string;
    };
    // "invalid_grant": has quitado el permiso desde tu cuenta de Google.
    if (datos.error === "invalid_grant") {
      return { ok: false, motivo: "permiso-retirado" };
    }
    console.error("Google no ha dado acceso", respuesta.status, datos.error);
    return { ok: false, motivo: "fallo" };
  }
  const datos = (await respuesta.json()) as { access_token?: string };
  if (!datos.access_token) return { ok: false, motivo: "fallo" };
  return { ok: true, token: datos.access_token };
}

// Un pase de una hora que SOLO sirve para Drive (drive.file), para que el
// navegador abra el selector de archivos. No sirve para leer tu calendario.
export async function pedirAccesoDrive(permiso: string) {
  try {
    return await pedirAcceso(permiso, PERMISO_DRIVE);
  } catch (error) {
    console.error("No se ha podido pedir acceso a Drive", error);
    return { ok: false as const, motivo: "fallo" as const };
  }
}

// Los calendarios que tienes marcados para ver en Google Calendar.
async function listarCalendarios(token: string): Promise<string[]> {
  const url = new URL(`${URL_CALENDARIO}/users/me/calendarList`);
  url.search = new URLSearchParams({
    maxResults: "50",
    fields: "items(id,selected,hidden)",
  }).toString();
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!respuesta.ok) return ["primary"];
  const datos = (await respuesta.json()) as {
    items?: { id: string; selected?: boolean; hidden?: boolean }[];
  };
  const visibles = (datos.items ?? [])
    .filter((c) => c.selected && !c.hidden)
    .map((c) => c.id)
    .slice(0, MAX_CALENDARIOS);
  return visibles.length > 0 ? visibles : ["primary"];
}

type EventoApi = {
  id: string;
  status?: string;
  summary?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

async function eventosDe(
  token: string,
  calendario: string,
  desde: Date,
  hasta: Date,
): Promise<EventoGoogle[]> {
  const url = new URL(
    `${URL_CALENDARIO}/calendars/${encodeURIComponent(calendario)}/events`,
  );
  url.search = new URLSearchParams({
    // singleEvents: Google ya reparte los eventos que se repiten en días sueltos.
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: desde.toISOString(),
    timeMax: hasta.toISOString(),
    maxResults: "250",
    fields: "items(id,status,summary,transparency,start,end)",
  }).toString();
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  // Si un calendario falla (por ejemplo, ya no lo compartes), se salta.
  if (!respuesta.ok) return [];
  const datos = (await respuesta.json()) as { items?: EventoApi[] };
  return (datos.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.start && e.end)
    .map((e) => ({
      id: e.id,
      calendario,
      titulo: e.summary ?? null,
      inicio: e.start!,
      fin: e.end!,
      libre: e.transparency === "transparent",
    }));
}

// Al desconectar, le decimos a Google que borre el permiso.
export async function revocarPermiso(permiso: string): Promise<void> {
  try {
    await fetch(URL_REVOCAR, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: permiso }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    // Si falla no pasa nada grave: la conexión se borra igual en DíaClaro.
    console.error("No se ha podido avisar a Google", error);
  }
}

// ---- Documentos importantes en tu Drive ----
// Todo con el pase de "drive.file": DíaClaro solo ve la carpeta y los
// archivos que ha creado él. El resto de tu Drive sigue sin verse.

const URL_DRIVE = "https://www.googleapis.com/drive/v3/files";

function conMarca(valor: string) {
  return `appProperties has { key='${MARCA}' and value='${valor}' } and trashed = false`;
}

async function pedirDrive(
  token: string,
  url: string | URL,
  opciones: RequestInit = {},
) {
  return fetch(url, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, ...opciones.headers },
    signal: AbortSignal.timeout(15_000),
  });
}

// Busca la carpeta «DíaClaro · Documentos importantes». Si no existe y
// se pide, la crea. Devuelve su id, o null si no está (o si Google falla).
export async function carpetaImportantes(
  token: string,
  crear: boolean,
): Promise<string | null> {
  const url = new URL(URL_DRIVE);
  url.search = new URLSearchParams({
    q: `mimeType = 'application/vnd.google-apps.folder' and ${conMarca(MARCA_CARPETA)}`,
    fields: "files(id)",
    pageSize: "1",
  }).toString();
  const respuesta = await pedirDrive(token, url);
  if (!respuesta.ok) throw new Error(`Drive ha fallado (${respuesta.status})`);
  const datos = (await respuesta.json()) as { files?: { id: string }[] };
  if (datos.files?.[0]) return datos.files[0].id;
  if (!crear) return null;
  const nueva = await pedirDrive(token, `${URL_DRIVE}?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: NOMBRE_CARPETA,
      mimeType: "application/vnd.google-apps.folder",
      appProperties: { [MARCA]: MARCA_CARPETA },
    }),
  });
  if (!nueva.ok) throw new Error(`Drive ha fallado (${nueva.status})`);
  return ((await nueva.json()) as { id: string }).id;
}

// Los documentos importantes que guardaste, del más nuevo al más viejo.
export async function listarImportantes(token: string): Promise<unknown[]> {
  const url = new URL(URL_DRIVE);
  url.search = new URLSearchParams({
    q: conMarca(MARCA_DOCUMENTO),
    fields:
      "files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,appProperties)",
    orderBy: "createdTime desc",
    pageSize: "200",
  }).toString();
  const respuesta = await pedirDrive(token, url);
  if (!respuesta.ok) throw new Error(`Drive ha fallado (${respuesta.status})`);
  return ((await respuesta.json()) as { files?: unknown[] }).files ?? [];
}

// Sube un archivo desde el servidor (lo que compartes desde la galería).
export async function subirAImportantes(
  token: string,
  cuerpo: { cuerpo: Blob; tipoContenido: string },
): Promise<boolean> {
  const respuesta = await pedirDrive(token, URL_SUBIDA_DRIVE, {
    method: "POST",
    headers: { "Content-Type": cuerpo.tipoContenido },
    body: cuerpo.cuerpo,
  });
  if (!respuesta.ok) console.error("Drive no ha guardado", respuesta.status);
  return respuesta.ok;
}

// Antes de cambiar o borrar, se comprueba que el archivo es un documento
// importante de DíaClaro (y no, por ejemplo, unos apuntes de un proyecto).
async function esImportante(token: string, id: string): Promise<boolean> {
  if (!/^[\w-]{1,200}$/.test(id)) return false;
  const respuesta = await pedirDrive(
    token,
    `${URL_DRIVE}/${id}?fields=appProperties,trashed`,
  );
  if (!respuesta.ok) return false;
  const datos = (await respuesta.json()) as {
    trashed?: boolean;
    appProperties?: Record<string, string>;
  };
  return !datos.trashed && datos.appProperties?.[MARCA] === MARCA_DOCUMENTO;
}

async function cambiarArchivo(token: string, id: string, cambios: object) {
  if (!(await esImportante(token, id)))
    throw new Error("Ese documento no es de DíaClaro.");
  const respuesta = await pedirDrive(token, `${URL_DRIVE}/${id}?fields=id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  if (!respuesta.ok) throw new Error(`Drive ha fallado (${respuesta.status})`);
}

export async function cambiarTipoImportante(
  token: string,
  id: string,
  tipo: TipoImportante,
) {
  await cambiarArchivo(token, id, { appProperties: { tipo } });
}

// Lo manda a la papelera de Drive: ahí puedes recuperarlo durante 30 días.
export async function papeleraImportante(token: string, id: string) {
  await cambiarArchivo(token, id, { trashed: true });
}
