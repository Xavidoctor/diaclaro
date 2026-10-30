"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { guardarPerfil } from "@/lib/data/perfil";
import { prepararPerfil } from "@/lib/planner/perfil";
import { createClient } from "@/lib/supabase/server";

export type PerfilState = { error?: string; guardado?: boolean };

// Guarda tu perfil. Primero comprueba que hay sesión.
export async function guardarPerfilAction(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const r = prepararPerfil({
    display_name: formData.get("display_name"),
    age: formData.get("age"),
    about: formData.get("about"),
    motto: formData.get("motto"),
  });
  if (!r.ok) return { error: r.error };
  try {
    await guardarPerfil(r.valor);
  } catch {
    return { error: "No se ha podido guardar. Revisa la conexión." };
  }
  refresh();
  return { guardado: true };
}
