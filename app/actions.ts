"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apuntarHecha, quitarUltimaHecha } from "@/lib/data/rutinas";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// El día de hoy se calcula aquí, en tu zona horaria, no lo manda el navegador.
async function datosRutina(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  return { id, hoy: await diaDeHoy() };
}

// Botón «Hecho» de una rutina en Hoy: apunta una vez más.
export async function marcarRutinaHecha(formData: FormData) {
  await exigirSesion();
  const { id, hoy } = await datosRutina(formData);
  await apuntarHecha(id, hoy);
  refresh();
}

// «Deshacer»: quita la última vez apuntada hoy.
export async function deshacerRutinaHecha(formData: FormData) {
  await exigirSesion();
  const { id, hoy } = await datosRutina(formData);
  await quitarUltimaHecha(id, hoy);
  refresh();
}
