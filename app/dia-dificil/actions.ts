"use server";

import { redirect } from "next/navigation";
import { aplicarRecortes } from "@/app/componentes/acciones-recortes";
import { leerAjustes } from "@/lib/data/ajustes";
import { guardarDiaDificil } from "@/lib/data/dia-dificil";
import { leerConservadas, leerMotivo } from "@/lib/planner/dia-dificil";
import { hoyEn } from "@/lib/planner/fechas";

// Acciones del Día difícil. Los cambios se aplican con la misma acción que los
// recortes del aviso de sobrecarga. Además se apunta que hoy es un día difícil
// y qué conservas, para que el cierre del día lo celebre.

async function apuntarDiaDificil(formData: FormData) {
  const motivo = leerMotivo(formData.get("motivo"));
  if (!motivo) return;
  const { timezone } = await leerAjustes();
  await guardarDiaDificil({
    on_date: hoyEn(timezone),
    reason: motivo,
    kept_task_ids: leerConservadas(formData.getAll("conservar")),
  });
}

// Un botón "Aceptar": aplica un cambio y te deja en la página.
export async function aceptarUnCambio(formData: FormData) {
  await aplicarRecortes(formData);
  await apuntarDiaDificil(formData);
}

// "Aceptar todo": aplica todos los cambios y te devuelve a Hoy con el día ya aligerado.
export async function aceptarDiaDificil(formData: FormData) {
  await aplicarRecortes(formData);
  await apuntarDiaDificil(formData);
  redirect("/");
}
