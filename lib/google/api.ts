import "server-only";
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
// "openid email" sirve para enseñarte con qué cuenta de Google conectaste.
const PERMISOS = `openid email ${PERMISO_CALENDARIO}`;

// Como mucho se leen 10 calendarios, para que la página no tarde.
const MAX_CALENDARIOS = 10;

export function googleDisponible(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function secretoGoogle(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

// La dirección de Google donde aceptas darle permiso a DíaClaro.
export function urlParaConectar(estado: string, vuelta: string): string {
  const url = new URL(URL_PERMISO);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: vuelta,
    response_type: "code",
    scope: PERMISOS,
    // "offline" + "consent": Google nos da un permiso duradero (refresh token)
    // para leer el calendario sin pedirte que aceptes cada vez.
    access_type: "offline",
    prompt: "consent",
    state: estado,
  }).toString();
  return url.toString();
}

export type Conexion =
  | { ok: true; permiso: string; email: string | null }
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
    if (!datos.scope?.split(" ").includes(PERMISO_CALENDARIO)) {
      return { ok: false, motivo: "sin-permiso-calendario" };
    }
    if (!datos.refresh_token) return { ok: false, motivo: "fallo" };
    return {
      ok: true,
      permiso: datos.refresh_token,
      email: emailDelToken(datos.id_token),
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
): Promise<
  { ok: true; token: string } | { ok: false; motivo: "permiso-retirado" | "fallo" }
> {
  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: permiso,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: secretoGoogle(),
      grant_type: "refresh_token",
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
