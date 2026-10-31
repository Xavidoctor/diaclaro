"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  enlaceDeVuelta,
  normalizarCodigo,
  normalizarEmail,
} from "@/lib/auth/validacion";
import { emailDemo, leerNumeroDemo } from "@/lib/planner/demo";

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

// Entrar escribiendo el código de 6 cifras del email, en lugar de tocar el
// enlace. Sirve sobre todo en el iPhone: el enlace se abre en Safari y la app
// instalada no comparte la sesión con Safari.
// (El código solo llega si la plantilla del email incluye {{ .Token }}.)
export async function entrarConCodigo(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizarEmail(formData.get("email"));
  if (!email) return { enviado: false, error: "Escribe un email válido." };
  const token = normalizarCodigo(formData.get("codigo"));
  if (!token)
    return { ...prev, enviado: true, email, error: "Escribe las 6 cifras del código." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return {
      enviado: true,
      email,
      error: "El código no es correcto o ha caducado. Revisa el último email o pide otro.",
    };
  }
  redirect("/");
}

// Botones «Demo 1/2/3»: entra con una cuenta de demostración, sin email.
// La contraseña está solo en Vercel (DEMO_PASSWORD), nunca en el navegador.
export async function entrarDemo(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const numero = leerNumeroDemo(formData.get("demo"));
  const password = process.env.DEMO_PASSWORD;
  if (!numero || !password) return "Las cuentas de prueba no están activadas.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDemo(numero),
    password,
  });
  if (error)
    return "No he podido entrar en la cuenta de prueba. Prueba otra vez en un momento.";
  redirect("/");
}
