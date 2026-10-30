import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, RUTA_VUELTA } from "@/app/api/google/estado";
import { guardarConexionGoogle } from "@/lib/data/google";
import { canjearCodigo, secretoGoogle } from "@/lib/google/api";
import { cifrar } from "@/lib/google/cifrado";

// Google te devuelve aquí después de aceptar (o de cancelar).
// Guardamos el permiso cifrado y volvemos a Ajustes con un mensaje.
export async function GET(request: NextRequest) {
  const volver = (resultado: string) => {
    const respuesta = NextResponse.redirect(
      new URL(`/ajustes?google=${resultado}#google`, request.url),
    );
    respuesta.cookies.delete({ name: COOKIE_ESTADO, path: "/api/google" });
    return respuesta;
  };

  const { searchParams } = request.nextUrl;
  if (searchParams.get("error")) return volver("cancelado");

  const codigo = searchParams.get("code");
  const estado = searchParams.get("state") ?? "";
  const esperado = request.cookies.get(COOKIE_ESTADO)?.value ?? "";
  if (!codigo || !mismoTexto(estado, esperado)) return volver("error");

  const vuelta = new URL(RUTA_VUELTA, request.url).toString();
  const conexion = await canjearCodigo(codigo, vuelta);
  if (!conexion.ok) {
    return volver(
      conexion.motivo === "sin-permiso-calendario" ? "sin-permiso" : "error",
    );
  }

  try {
    await guardarConexionGoogle({
      google_email: conexion.email,
      refresh_token_cifrado: cifrar(conexion.permiso, secretoGoogle()),
    });
  } catch (error) {
    console.error(error);
    return volver("error");
  }
  return volver("conectado");
}

// Compara sin dar pistas por el tiempo que tarda.
function mismoTexto(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
