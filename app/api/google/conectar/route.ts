import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ESTADO,
  COOKIE_VOLVER,
  RUTA_VUELTA,
} from "@/app/api/google/estado";
import { googleDisponible, urlParaConectar } from "@/lib/google/api";
import { direccionDeVuelta } from "@/lib/planner/drive";

// Pulsas «Conectar con Google» en Ajustes y llegas aquí: te mandamos a
// Google para que aceptes que DíaClaro lea (solo lea) tu calendario.
// Con ?drive=1 pide además el permiso de Drive (solo los archivos que elijas),
// y con ?volver=/ruta vuelve a esa pantalla al acabar.
// El proxy ya se asegura de que has iniciado sesión.
export async function GET(request: NextRequest) {
  if (!googleDisponible()) {
    return NextResponse.redirect(
      new URL("/ajustes?google=no-disponible#google", request.url),
    );
  }
  const estado = randomBytes(24).toString("base64url");
  const vuelta = new URL(RUTA_VUELTA, request.url).toString();
  const { searchParams } = request.nextUrl;
  const conDrive = searchParams.get("drive") === "1";
  const respuesta = NextResponse.redirect(
    urlParaConectar(estado, vuelta, conDrive),
  );
  const opciones = {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/api/google",
    maxAge: 600,
  };
  respuesta.cookies.set(COOKIE_ESTADO, estado, opciones);
  const volver = direccionDeVuelta(searchParams.get("volver"));
  if (volver) respuesta.cookies.set(COOKIE_VOLVER, volver, opciones);
  else respuesta.cookies.delete({ name: COOKIE_VOLVER, path: "/api/google" });
  return respuesta;
}
