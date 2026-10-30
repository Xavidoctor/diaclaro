"use server";

import { redirect } from "next/navigation";
import { aplicarRecortes } from "@/app/componentes/acciones-recortes";

// "Aceptar todo" del Día difícil: aplica los cambios (con la misma acción que
// los recortes del aviso de sobrecarga) y te devuelve a Hoy con el día ya aligerado.
export async function aceptarDiaDificil(formData: FormData) {
  await aplicarRecortes(formData);
  redirect("/");
}
