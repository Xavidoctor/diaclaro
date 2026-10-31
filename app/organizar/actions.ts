"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cambiarTarea } from "@/lib/data/bandeja";
import { diaDeHoy } from "@/lib/data/dia-activo";
import { leerBloquesAceptados } from "@/lib/planner/organizar";
import { createClient } from "@/lib/supabase/server";

// «Aceptar el plan»: pone a cada tarea propuesta la hora de su bloque (y el
// día de hoy, por si venía atrasada). Así sale en la Agenda y en Hoy.
export async function aceptarPlan(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const bloques = leerBloquesAceptados(formData.getAll("bloque"));
  const hoy = await diaDeHoy();
  for (const b of bloques)
    await cambiarTarea(b.id, { due_date: hoy, due_time: b.hora });
  refresh();
  redirect("/");
}
