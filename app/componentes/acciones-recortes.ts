"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cambiarTarea } from "@/lib/data/bandeja";
import { esFecha } from "@/lib/planner/fechas";
import { leerMinutosReales } from "@/lib/planner/tiempos";
import { createClient } from "@/lib/supabase/server";

// Acciones del aviso de sobrecarga: aplicar los recortes que tú aceptas.
// Cada recorte llega como texto "id|aplazar|2026-10-31" o "id|acortar|45".

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

async function aplicarUno(valor: FormDataEntryValue) {
  if (typeof valor !== "string") return;
  const [id, tipo, dato] = valor.split("|");
  if (!id) return;
  if (tipo === "aplazar" && esFecha(dato)) {
    await cambiarTarea(id, { due_date: dato });
  } else if (tipo === "acortar") {
    const minutos = leerMinutosReales(dato);
    if (minutos) await cambiarTarea(id, { estimated_minutes: minutos });
  }
}

// Un botón "Aceptar" manda un recorte; "Aceptar todos", varios.
export async function aplicarRecortes(formData: FormData) {
  await exigirSesion();
  for (const valor of formData.getAll("recorte")) await aplicarUno(valor);
  refresh();
}
