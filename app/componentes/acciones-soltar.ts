"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { MoverTareasState } from "@/app/bandeja/actions";
import { soltarTareas } from "@/lib/data/bandeja";
import { leerIds } from "@/lib/planner/bandeja";
import { createClient } from "@/lib/supabase/server";

// «Soltar» en las tareas de otros días: les quita la fecha, sin borrarlas.
export async function soltarTareasA(
  _prev: MoverTareasState,
  formData: FormData,
): Promise<MoverTareasState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const ids = leerIds(formData.get("ids"));
  if (ids.length === 0) return { error: "No hay ninguna tarea que soltar." };
  try {
    await soltarTareas(ids);
  } catch {
    return { error: "No se ha podido soltar. Vuelve a probar." };
  }
  refresh();
  return {};
}
