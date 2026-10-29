"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarCodigo, normalizarEmail } from "@/lib/auth/validacion";

export type LoginState = {
  paso: "email" | "codigo";
  email?: string;
  error?: string;
};

// Paso 1: enviar un código de acceso al email.
export async function enviarCodigo(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizarEmail(formData.get("email"));
  if (!email) {
    return { paso: "email", error: "Escribe un email válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    return {
      paso: "email",
      email,
      error: "No he podido enviar el código. Espera un minuto y vuelve a probar.",
    };
  }

  return { paso: "codigo", email };
}

// Paso 2: comprobar el código y abrir la sesión.
export async function verificarCodigo(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizarEmail(formData.get("email"));
  const codigo = normalizarCodigo(formData.get("codigo"));
  if (!email) {
    return { paso: "email", error: "Vuelve a escribir tu email." };
  }
  if (!codigo) {
    return { paso: "codigo", email, error: "El código son solo cifras." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  });
  if (error) {
    return {
      ...prev,
      paso: "codigo",
      email,
      error: "El código no es correcto o ha caducado. Pide uno nuevo si hace falta.",
    };
  }

  redirect("/");
}
