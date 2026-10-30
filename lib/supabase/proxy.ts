import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Rutas que se pueden abrir sin haber iniciado sesión.
const PUBLIC_PATHS = ["/login", "/auth"];

// Se ejecuta antes de cada petición (desde proxy.ts):
// 1. renueva la sesión si ha caducado y guarda las cookies nuevas;
// 2. si no hay sesión, manda a /login.
export async function updateSession(request: NextRequest) {
  // Si Supabase no reconoce la dirección de vuelta, manda el enlace a la
  // página principal (/?code=...). Lo reenviamos a /auth/confirm para no
  // perder el código y que el login funcione igual.
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname !== "/auth/confirm" &&
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
