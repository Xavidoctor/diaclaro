import "server-only";
import webpush, { WebPushError } from "web-push";
import {
  clavePublicaValida,
  type ContenidoAviso,
  type Suscripcion,
} from "@/lib/planner/avisos";

// Envía un aviso a un móvil u ordenador con el estándar "Web Push" (gratis).
// Las claves se guardan en Vercel: VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.

export function clavePublica(): string | null {
  const clave = process.env.VAPID_PUBLIC_KEY;
  return clavePublicaValida(clave) ? (clave as string) : null;
}

export function avisosConfigurados(): boolean {
  return clavePublica() !== null && Boolean(process.env.VAPID_PRIVATE_KEY);
}

// Devuelve el código de respuesta del servicio de avisos del navegador.
// 404 o 410 = esa dirección ya no existe (por ejemplo, desinstalaste la app).
export async function enviarAviso(
  sub: Suscripcion,
  contenido: ContenidoAviso,
): Promise<number> {
  const publica = clavePublica();
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) throw new Error("Faltan las claves de avisos.");
  const web = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    const r = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(contenido),
      {
        vapidDetails: {
          subject: `https://${web ?? "diaclaro.vercel.app"}`,
          publicKey: publica,
          privateKey: privada,
        },
        // Si el móvil está apagado, el aviso espera como mucho 1 hora.
        TTL: 3600,
      },
    );
    return r.statusCode;
  } catch (e) {
    if (e instanceof WebPushError) return e.statusCode;
    throw e;
  }
}
