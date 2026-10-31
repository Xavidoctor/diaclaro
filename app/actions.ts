"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apuntarHecha, quitarHecha } from "@/lib/data/rutinas";
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
  // Qué vez del día (1, 2...), si la rutina se hace varias veces.
  const numero = Number(formData.get("vez"));
  const vez =
    Number.isInteger(numero) && numero >= 1 && numero <= 20 ? numero : null;
  return { id, vez, hoy: await diaDeHoy() };
}

// Botón «Hecho» de una rutina en Hoy: apunta una vez más (o esa vez).
export async function marcarRutinaHecha(formData: FormData) {
  await exigirSesion();
  const { id, vez, hoy } = await datosRutina(formData);
  await apuntarHecha(id, hoy, vez);
  refresh();
}

// «Deshacer»: quita la última vez apuntada hoy (o esa vez).
export async function deshacerRutinaHecha(formData: FormData) {
  await exigirSesion();
  const { id, vez, hoy } = await datosRutina(formData);
  await quitarHecha(id, hoy, vez);
  refresh();
}
