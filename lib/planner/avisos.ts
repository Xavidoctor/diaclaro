import { z } from "zod";
import type { Resultado } from "./bandeja";

// Reglas de los avisos con la app cerrada (notificaciones push).
// Funciones puras, con pruebas en avisos.test.ts.
//
// El texto del aviso es amable y corto: dice qué hábito y a qué hora querías
// acordarte, y pregunta si lo apuntas. Sin sermones ni "¡no lo olvides!".

// Lo que Supabase manda a /api/avisos/enviar cada vez que toca un aviso.
const esquemaPeticion = z.object({
  endpoint: z.url().max(1000),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
  // Cada aviso es de un hábito, de una rutina o de una meta (solo de uno).
  habito: z.uuid().optional(),
  // Aviso antes de empezar una rutina con foco (migración 20261030380000).
  rutina: z.uuid().optional(),
  titulo: z.string().min(1).max(100),
  // Hábito: la hora del recordatorio. Rutina: la hora a la que empieza.
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  // Una de tus frases, al azar (desde la migración 20261030350000). null = ninguna.
  frase: z.string().min(1).max(200).nullish(),
  // Rutina: cuántos minutos antes de empezar llega el aviso.
  minutos: z.number().int().min(1).max(120).optional(),
  // Aviso de una meta de un proyecto (migración 20261030450000).
  meta: z.uuid().optional(),
  tipo: z.enum(["meta", "entrega", "examen"]).optional(),
  proyecto: z.string().min(1).max(100).optional(),
  // La página del proyecto, para abrirla al tocar el aviso.
  ruta: z
    .string()
    .regex(/^\/areas\/[0-9a-f-]{36}\/proyectos\/[0-9a-f-]{36}$/i)
    .optional(),
  // Días que faltan hasta la fecha de la meta. null = la meta no tiene fecha.
  dias: z.number().int().nullish(),
});

export type PeticionAviso = z.infer<typeof esquemaPeticion>;

export function leerPeticionAviso(datos: unknown): Resultado<PeticionAviso> {
  const r = esquemaPeticion.safeParse(datos);
  // Cada aviso es de una sola cosa: un hábito, una rutina o una meta.
  const deQue = r.success
    ? [r.data.habito, r.data.rutina, r.data.meta].filter(Boolean).length
    : 0;
  if (!r.success || deQue !== 1 || (r.data.meta && !r.data.ruta))
    return { ok: false, error: "Petición no válida." };
  return { ok: true, valor: r.data };
}

export type ContenidoAviso = {
  title: string;
  body: string;
  // Con la misma etiqueta, un aviso nuevo reemplaza al anterior en vez de apilarse.
  tag: string;
  url: string;
};

export function contenidoAviso(
  p: Pick<
    PeticionAviso,
    | "habito"
    | "rutina"
    | "titulo"
    | "hora"
    | "frase"
    | "minutos"
    | "meta"
    | "tipo"
    | "proyecto"
    | "ruta"
    | "dias"
  >,
): ContenidoAviso {
  if (p.meta) {
    const tipo =
      p.tipo === "examen"
        ? "Examen"
        : p.tipo === "entrega"
          ? "Entrega"
          : "Meta";
    return {
      title: `${tipo}: ${p.titulo}`,
      body: [p.proyecto, textoDiasAviso(p.dias)].filter(Boolean).join(" · "),
      tag: `meta-${p.meta}`,
      // Al tocarlo, se abre el proyecto justo en esa meta.
      url: `${p.ruta}#meta-${p.meta}`,
    };
  }
  if (p.rutina) {
    const cuando = p.minutos ? `En ${p.minutos} min` : "Dentro de poco";
    return {
      title: `${cuando}: ${p.titulo}`,
      body: `Empieza a las ${p.hora}. Ve terminando lo que estés haciendo y prepárate.`,
      tag: `rutina-${p.rutina}`,
      // Al tocarlo, se abre Foco con esa rutina lista para empezar.
      url: `/foco?rutina=${p.rutina}`,
    };
  }
  const recordatorio = `Recordatorio de las ${p.hora}.`;
  return {
    title: p.titulo,
    body: p.frase
      ? `${p.frase}\n${recordatorio}`
      : `${recordatorio} Hoy aún no has apuntado nada. ¿Lo apuntas?`,
    tag: `habito-${p.habito}`,
    // Al tocarlo, se abre Hábitos justo en ese hábito.
    url: `/habitos#habito-${p.habito}`,
  };
}

// Cuánto falta, dicho en corto para el aviso.
function textoDiasAviso(dias: number | null | undefined): string | null {
  if (dias === null || dias === undefined) return null;
  if (dias === 0) return "Es hoy.";
  if (dias === 1) return "Es mañana.";
  if (dias > 1) return `Faltan ${dias} días.`;
  return "Ya ha pasado la fecha.";
}

// El aviso de prueba que mandas tú desde la pantalla de avisos.
export const AVISO_DE_PRUEBA: ContenidoAviso = {
  title: "DíaClaro",
  body: "Los avisos funcionan en este dispositivo.",
  tag: "prueba",
  url: "/habitos/avisos",
};

// Comprueba la contraseña compartida con Supabase: "Bearer <secreto>".
// Compara siempre todos los caracteres, para no dar pistas por el tiempo que tarda.
export function cabeceraValida(
  cabecera: string | null,
  secreto: string | undefined,
): boolean {
  if (!secreto || secreto.length < 32 || !cabecera) return false;
  const esperada = `Bearer ${secreto}`;
  if (cabecera.length !== esperada.length) return false;
  let diferencia = 0;
  for (let i = 0; i < esperada.length; i++)
    diferencia |= cabecera.charCodeAt(i) ^ esperada.charCodeAt(i);
  return diferencia === 0;
}

// Una dirección de avisos tal como la da el navegador (PushSubscription.toJSON()).
const esquemaSuscripcion = z.object({
  endpoint: z
    .url()
    .max(1000)
    .refine((u) => u.startsWith("https://"), "La dirección no es segura."),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };

export function leerSuscripcion(datos: unknown): Resultado<Suscripcion> {
  const r = esquemaSuscripcion.safeParse(datos);
  if (!r.success)
    return {
      ok: false,
      error: "El navegador no ha dado una dirección válida.",
    };
  return {
    ok: true,
    valor: {
      endpoint: r.data.endpoint,
      p256dh: r.data.keys.p256dh,
      auth: r.data.keys.auth,
    },
  };
}

// ---- Claves (se crean una vez, en tu navegador) ----

// Bytes → texto base64url (el formato que usan las claves de avisos).
export function aBase64Url(bytes: Uint8Array): string {
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Texto base64url → bytes (lo necesita el navegador para activar los avisos).
export function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const binario = atob((texto + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// La clave pública de avisos tiene 65 bytes (87 caracteres en base64url).
export function clavePublicaValida(clave: string | undefined): boolean {
  if (!clave || !/^[A-Za-z0-9_-]+$/.test(clave)) return false;
  return deBase64Url(clave).length === 65;
}

// La línea que hay que ejecutar en Supabase para guardar la contraseña en Vault.
export function sqlGuardarSecreto(secreto: string): string {
  return `select vault.create_secret('${secreto}', 'diaclaro_avisos');`;
}
