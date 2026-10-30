import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { dominioAlQueRedirigir } from "@/lib/auth/dominio";

// Rutas que se pueden abrir sin haber iniciado sesión.
// /api/avisos/enviar la llama Supabase con su propia contraseña (no hay sesión).
const PUBLIC_PATHS = ["/login", "/auth", "/api/avisos/enviar"];

// Se ejecuta antes de cada petición (desde proxy.ts):
// 1. renueva la sesión si ha caducado y guarda las cookies nuevas;
// 2. si no hay sesión, manda a /login.
export async function updateSession(request: NextRequest) {
  // Si entras por un alias de Vercel, te lleva a la dirección principal.
  // Así pides el enlace y lo abres siempre en la misma web.
  // VERCEL_ENV y VERCEL_PROJECT_PRODUCTION_URL las pone Vercel solo.
  const principal = dominioAlQueRedirigir({
    host: request.headers.get("host"),
    entorno: process.env.VERCEL_ENV,
    principal: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  if (principal) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = principal;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Si Supabase no reconoce la dirección de vuelta, manda el enlace a la
  // página principal (/?code=...). Lo reenviamos a /auth/confirm para no
  // perder el código y que el login funcione igual.
  // (Google también vuelve con ?code= a /api/google/vuelta: ese no se toca.)
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname !== "/auth/confirm" &&
    !pathname.startsWith("/api/google/") &&
    (searchParams.has("code") || searchParams.has("token_hash"))
  ) {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = "/auth/confirm";
    return NextResponse.redirect(confirmUrl);
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // No pongas código entre createServerClient y getClaims():
  // getClaims() es lo que renueva la sesión.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const isPublic = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!isLoggedIn && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirect = NextResponse.redirect(loginUrl);
    // Copiamos las cookies y cabeceras de caché que haya preparado Supabase.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    ["cache-control", "expires", "pragma"].forEach((key) => {
      const value = response.headers.get(key);
      if (value) redirect.headers.set(key, value);
    });
    return redirect;
  }

  return response;
}
