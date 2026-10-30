"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { enlazarDocumentos, quitarDocumento } from "@/lib/data/google";
import { prepararDocumentos } from "@/lib/planner/drive";
import { createClient } from "@/lib/supabase/server";

// Acciones de los documentos de Drive de un proyecto.
// Solo cambian DíaClaro: en tu Drive no se toca nada.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// Guarda los documentos que has elegido en el selector de Google.
export async function enlazarDeDrive(proyectoId: string, elegidos: unknown) {
  await exigirSesion();
  if (typeof proyectoId !== "string" || proyectoId === "")
    throw new Error("Falta el proyecto.");
  await enlazarDocumentos(proyectoId, prepararDocumentos(elegidos));
  refresh();
}

export async function quitarDocumentoAction(formData: FormData) {
  await exigirSesion();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  await quitarDocumento(id);
  refresh();
}
