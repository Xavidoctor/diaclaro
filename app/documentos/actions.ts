"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { paseDrive } from "@/app/documentos/pase-drive";
import {
  cambiarTipoImportante,
  carpetaImportantes,
  papeleraImportante,
} from "@/lib/google/api";
import { leerTipo } from "@/lib/planner/documentos-importantes";
import { createClient } from "@/lib/supabase/server";

// Acciones de «Documentos importantes». Todo pasa en tu Google Drive:
// DíaClaro no guarda copia de tus documentos.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

async function pase(): Promise<string> {
  const p = await paseDrive();
  if (!p.ok) throw new Error("Google no me deja abrir tu Drive.");
  return p.token;
}

// Antes de subir desde el móvil: el navegador recibe un pase de una hora
// (solo para Drive) y el id de la carpeta, y sube el archivo directo a Drive.
export async function prepararSubida(): Promise<
  { ok: true; token: string; carpeta: string } | { ok: false; mensaje: string }
> {
  await exigirSesion();
  const p = await paseDrive();
  if (!p.ok)
    return {
      ok: false,
      mensaje:
        p.motivo === "fallo"
          ? "Ahora mismo no puedo hablar con Google. Prueba en un rato."
          : "Google no me deja abrir tu Drive. Vuelve a conectarlo.",
    };
  try {
    const carpeta = await carpetaImportantes(p.token, true);
    if (!carpeta) throw new Error("Sin carpeta");
    return { ok: true, token: p.token, carpeta };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      mensaje: "No he podido preparar la carpeta en tu Drive. Prueba otra vez.",
    };
  }
}

export async function cambiarTipo(formData: FormData) {
  await exigirSesion();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  await cambiarTipoImportante(await pase(), id, leerTipo(formData.get("tipo")));
  refresh();
}

export async function mandarAPapelera(formData: FormData) {
  await exigirSesion();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  await papeleraImportante(await pase(), id);
  refresh();
}

// Pase de una hora (solo Drive) para que el móvil baje una copia de tus
// documentos y puedas verlos sin internet.
export async function paseParaCopias(): Promise<string | null> {
  await exigirSesion();
  const p = await paseDrive();
  return p.ok ? p.token : null;
}
