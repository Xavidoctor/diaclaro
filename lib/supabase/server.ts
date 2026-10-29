import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase/env";

// Cliente de Supabase para el servidor (páginas y acciones de servidor).
// Crea uno nuevo en cada petición: nunca lo guardes en una variable global.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Las páginas (Server Components) no pueden escribir cookies.
          // No pasa nada: proxy.ts ya renueva la sesión en cada petición.
        }
      },
    },
  });
}
