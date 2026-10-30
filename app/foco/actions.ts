"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { leerAjustes } from "@/lib/data/ajustes";
import { borrarSesion, guardarSesion } from "@/lib/data/foco";
import { hoyEn } from "@/lib/planner/fechas";
import { prepararSesion } from "@/lib/planner/foco";
import { createClient } from "@/lib/supabase/server";

// Acciones del temporizador de foco. Se ejecutan en el servidor.
// Cada una comprueba primero que hay sesión: se pueden llamar desde fuera de la app.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export type GuardarFocoState = { envios: number; error?: string };

// Guarda un rato de foco al terminar el temporizador.
export async function guardarSesionFoco(
  prev: GuardarFocoState,
  formData: FormData,
): Promise<GuardarFocoState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const r = prepararSesion(
    {
      tarea: formData.get("tarea"),
      inicio: formData.get("inicio"),
      objetivo: formData.get("objetivo"),
      minutos: formData.get("minutos"),
    },
    new Date(),
  );
  if (!r.ok) return { envios, error: r.error };

  // El día se calcula aquí, en tu zona horaria (el del momento en que empezaste).
  const { timezone } = await leerAjustes();
  const on_date = hoyEn(timezone, new Date(r.valor.started_at));
  await guardarSesion({ ...r.valor, on_date });
  refresh();
  return { envios };
}

export async function borrarSesionFoco(formData: FormData) {
  await exigirSesion();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  await borrarSesion(id);
  refresh();
}
