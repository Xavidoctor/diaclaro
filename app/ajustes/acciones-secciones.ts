"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { guardarSecciones } from "@/lib/data/secciones";
import { leerCasilla } from "@/lib/planner/secciones";
import { createClient } from "@/lib/supabase/server";

// Guarda qué secciones opcionales quieres ver (Empleo y Documentos).

export type SeccionesState = { error?: string; guardado?: boolean };

export async function guardarSeccionesAction(
  _prev: SeccionesState,
  formData: FormData,
): Promise<SeccionesState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  try {
    await guardarSecciones({
      empleo: leerCasilla(formData.get("empleo")),
      documentos: leerCasilla(formData.get("documentos")),
    });
  } catch (error) {
    console.error(error);
    return { error: "No se ha podido guardar. Vuelve a probar en un rato." };
  }
  refresh();
  return { guardado: true };
}
