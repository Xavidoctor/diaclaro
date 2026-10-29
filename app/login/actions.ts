"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { enlaceDeVuelta, normalizarEmail } from "@/lib/auth/validacion";

export type LoginState = {
  enviado: boolean;
  email?: string;
  error?: string;
};

// Envía un email con un enlace para entrar. Al tocarlo, se abre /auth/confirm
// y allí se abre la sesión.
export async function enviarEnlace(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizarEmail(formData.get("email"));
  if (!email) {
    return { enviado: false, error: "Escribe un email válido." };
  }

  const cabeceras = await headers();
  const emailRedirectTo = enlaceDeVuelta({
    origin: cabeceras.get("origin"),
    host: cabeceras.get("x-forwarded-host") ?? cabeceras.get("host"),
    proto: cabeceras.get("x-forwarded-proto"),
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) {
    return {
      enviado: false,
      email,
      error: "No he podido enviar el email. Espera un minuto y vuelve a probar.",
    };
  }

  return { enviado: true, email };
}
