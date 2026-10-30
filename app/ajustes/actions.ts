"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { guardarAjustes } from "@/lib/data/ajustes";
import { borrarConexionGoogle, leerConexionGoogle } from "@/lib/data/google";
import { borrarRutina, cambiarRutina, crearRutina } from "@/lib/data/rutinas";
import { revocarPermiso, secretoGoogle } from "@/lib/google/api";
import { descifrar } from "@/lib/google/cifrado";
import { prepararAjustes } from "@/lib/planner/ajustes";
import { prepararRutina } from "@/lib/planner/rutinas";
import { createClient } from "@/lib/supabase/server";

// Acciones de Ajustes y Rutinas. Cada una comprueba primero que hay sesión.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

function leerId(formData: FormData): string {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") throw new Error("Falta el id.");
  return id;
}

// ---- Ajustes ----

export type AjustesState = { error?: string; guardado?: boolean };

export async function guardarAjustesAction(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  await exigirSesion();
  const r = prepararAjustes({
    timezone: formData.get("timezone"),
    wake_time: formData.get("wake_time"),
    sleep_time: formData.get("sleep_time"),
    lunch_time: formData.get("lunch_time"),
    dinner_time: formData.get("dinner_time"),
  });
  if (!r.ok) return { error: r.error };
  try {
    await guardarAjustes(r.valor);
  } catch {
    return { error: "No se han podido guardar. Revisa la conexión." };
  }
  refresh();
  return { guardado: true };
}

// ---- Rutinas ----

export type ValoresFormRutina = Record<
  | "title"
  | "notes"
  | "cuando"
  | "times_per_day"
  | "duration_minutes"
  | "window_start"
  | "window_end"
  | "part_of_day",
  string
> & { dias: string[] };

// Si algo falla, "valores" devuelve lo escrito para no perderlo
// ("envios" cambia en cada intento y sirve para redibujar el formulario).
export type FormRutinaState = {
  envios: number;
  error?: string;
  valores?: ValoresFormRutina;
};

function valoresEscritos(formData: FormData): ValoresFormRutina {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  return {
    title: texto("title"),
    notes: texto("notes"),
    cuando: texto("cuando"),
    times_per_day: texto("times_per_day"),
    duration_minutes: texto("duration_minutes"),
    window_start: texto("window_start"),
    window_end: texto("window_end"),
    part_of_day: texto("part_of_day"),
    dias: formData.getAll("dias").map(String),
  };
}

// Crear o cambiar una rutina (si el formulario trae "id", es cambiar).
export async function guardarRutina(
  prev: FormRutinaState,
  formData: FormData,
): Promise<FormRutinaState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = valoresEscritos(formData);
  const r = prepararRutina({
    ...valores,
    dias: formData.getAll("dias"),
  });
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarRutina(id, r.valor);
    else await crearRutina(r.valor);
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      valores,
    };
  }
  redirect("/ajustes");
}

// Pausar: deja de salir en Hoy, pero no se borra.
export async function pausarRutina(formData: FormData) {
  await exigirSesion();
  await cambiarRutina(leerId(formData), {
    active: formData.get("activa") === "si",
  });
  refresh();
}

export async function eliminarRutina(formData: FormData) {
  await exigirSesion();
  await borrarRutina(leerId(formData));
  redirect("/ajustes");
}

// ---- Google Calendar ----

// Quita la conexión: le pide a Google que borre el permiso y lo borra aquí.
export async function desconectarGoogle() {
  await exigirSesion();
  const conexion = await leerConexionGoogle();
  if (conexion) {
    const permiso = descifrar(conexion.refresh_token_cifrado, secretoGoogle());
    if (permiso) await revocarPermiso(permiso);
    await borrarConexionGoogle();
  }
  redirect("/ajustes?google=desconectado#google");
}
