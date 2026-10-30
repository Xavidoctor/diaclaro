import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, RUTA_VUELTA } from "@/app/api/google/estado";
import { googleDisponible, urlParaConectar } from "@/lib/google/api";

// Pulsas «Conectar con Google» en Ajustes y llegas aquí: te mandamos a
// Google para que aceptes que DíaClaro lea (solo lea) tu calendario.
// El proxy ya se asegura de que has iniciado sesión.
export async function GET(request: NextRequest) {
  if (!googleDisponible()) {
    return NextResponse.redirect(
      new URL("/ajustes?google=no-disponible#google", request.url),
    );
  }
  const estado = randomBytes(24).toString("base64url");
  const vuelta = new URL(RUTA_VUELTA, request.url).toString();
  const respuesta = NextResponse.redirect(urlParaConectar(estado, vuelta));
  respuesta.cookies.set(COOKIE_ESTADO, estado, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return respuesta;
}
