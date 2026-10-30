"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { leerAjustes } from "@/lib/data/ajustes";
import {
  apuntarHabito,
  borrarHabito,
  cambiarHabito,
  crearHabito,
  quitarUltimoApunte,
} from "@/lib/data/habitos";
import { hoyEn } from "@/lib/planner/fechas";
import { prepararApunte, prepararHabito } from "@/lib/planner/habitos";
import { createClient } from "@/lib/supabase/server";

// Acciones de los Hábitos. Cada una comprueba primero que hay sesión.

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

// El día de hoy se calcula aquí, en tu zona horaria, no lo manda el navegador.
async function hoy() {
  const { timezone } = await leerAjustes();
  return hoyEn(timezone);
}

// ---- Crear y cambiar hábitos ----

export type ValoresFormHabito = Record<
  | "title"
  | "notes"
  | "direction"
  | "unit"
  | "daily_target"
  | "cuando"
  | "routine_id",
  string
> & { dias: string[] };

// Si algo falla, "valores" devuelve lo escrito para no perderlo
// ("envios" cambia en cada intento y sirve para redibujar el formulario).
export type FormHabitoState = {
  envios: number;
  error?: string;
  valores?: ValoresFormHabito;
};

function valoresEscritos(formData: FormData): ValoresFormHabito {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  return {
    title: texto("title"),
    notes: texto("notes"),
    direction: texto("direction"),
    unit: texto("unit"),
    daily_target: texto("daily_target"),
    cuando: texto("cuando"),
    routine_id: texto("routine_id"),
    dias: formData.getAll("dias").map(String),
  };
}

// Crear o cambiar un hábito (si el formulario trae "id", es cambiar).
export async function guardarHabito(
  prev: FormHabitoState,
  formData: FormData,
): Promise<FormHabitoState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = valoresEscritos(formData);
  const r = prepararHabito({ ...valores, dias: formData.getAll("dias") });
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarHabito(id, r.valor);
    else await crearHabito(r.valor);
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      valores,
    };
  }
  redirect("/habitos");
}

// Pausar: deja de salir en Hoy, pero no se borra nada.
export async function pausarHabito(formData: FormData) {
  await exigirSesion();
  await cambiarHabito(leerId(formData), {
    active: formData.get("activo") === "si",
  });
  refresh();
}

export async function eliminarHabito(formData: FormData) {
  await exigirSesion();
  await borrarHabito(leerId(formData));
  redirect("/habitos");
}

// ---- Apuntar ----

export type ApunteState = { envios: number; error?: string };

// Apunta una cantidad (vacío = 1) y una nota opcional, en el día de hoy.
export async function apuntar(
  prev: ApunteState,
  formData: FormData,
): Promise<ApunteState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const r = prepararApunte({
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!r.ok) return { envios, error: r.error };
  try {
    await apuntarHabito(leerId(formData), await hoy(), r.valor);
  } catch {
    return { envios, error: "No se ha podido apuntar. Revisa la conexión." };
  }
  refresh();
  return { envios };
}

// «Deshacer»: quita el último apunte de hoy.
export async function deshacerApunte(formData: FormData) {
  await exigirSesion();
  await quitarUltimoApunte(leerId(formData), await hoy());
  refresh();
}
