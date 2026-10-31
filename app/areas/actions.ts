"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  borrarArea,
  borrarProyecto,
  cambiarArea,
  cambiarProyecto,
  crearArea,
  crearAreasSugeridas,
  crearProyecto,
  moverArea as moverAreaEnLista,
} from "@/lib/data/areas";
import { crearTarea } from "@/lib/data/bandeja";
import { guardarHorasSueno } from "@/lib/data/horas-libres";
import { prepararHorasSueno } from "@/lib/planner/horas-libres";
import { prepararArea, prepararProyecto } from "@/lib/planner/areas";
import { prepararCambiosTarea } from "@/lib/planner/bandeja";
import { createClient } from "@/lib/supabase/server";

// Acciones de Áreas y Proyectos. Cada una comprueba primero que hay sesión.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

function leerTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  if (typeof valor !== "string" || valor === "")
    throw new Error(`Falta ${campo}.`);
  return valor;
}

// Si algo falla, "valores" devuelve lo escrito para no perderlo
// ("envios" cambia en cada intento y sirve para redibujar el formulario).
export type FormState<V> = { envios: number; error?: string; valores?: V };

const ERROR_CONEXION =
  "No se ha podido guardar. Revisa la conexión y vuelve a probar.";

// ---- Áreas ----

export type ValoresFormArea = {
  name: string;
  horas: string;
  personal_time: boolean;
};

// Crear o cambiar un área (si el formulario trae "id", es cambiar).
export async function guardarArea(
  prev: FormState<ValoresFormArea>,
  formData: FormData,
): Promise<FormState<ValoresFormArea>> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = {
    name: String(formData.get("name") ?? ""),
    horas: String(formData.get("horas") ?? ""),
    personal_time: formData.get("personal_time") === "si",
  };
  const r = prepararArea({
    name: valores.name,
    horas: valores.horas,
    personal_time: formData.get("personal_time"),
  });
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarArea(id, r.valor);
    else await crearArea(r.valor);
  } catch {
    return { envios, error: ERROR_CONEXION, valores };
  }
  if (typeof id === "string" && id !== "") redirect(`/areas/${id}`);
  redirect("/areas");
}

export async function crearSugeridas() {
  await exigirSesion();
  await crearAreasSugeridas();
  refresh();
}

// Archivar: deja de contar en el resumen de la semana, pero no se borra.
export async function archivarArea(formData: FormData) {
  await exigirSesion();
  await cambiarArea(leerTexto(formData, "id"), {
    archived_at:
      formData.get("archivar") === "si" ? new Date().toISOString() : null,
  });
  refresh();
}

export async function eliminarArea(formData: FormData) {
  await exigirSesion();
  await borrarArea(leerTexto(formData, "id"));
  redirect("/areas");
}

// Sube o baja un área un puesto en la lista.
export async function moverArea(formData: FormData) {
  await exigirSesion();
  const paso = formData.get("paso") === "subir" ? -1 : 1;
  await moverAreaEnLista(leerTexto(formData, "id"), paso);
  refresh();
}

// ---- Horas libres a la semana ----

export type ValoresHorasSueno = { sueno: string };

// Guarda las horas de sueño de la barra de Áreas.
export async function guardarHorasLibres(
  prev: FormState<ValoresHorasSueno>,
  formData: FormData,
): Promise<FormState<ValoresHorasSueno>> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = { sueno: String(formData.get("sueno") ?? "") };
  const r = prepararHorasSueno(valores);
  if (!r.ok) return { envios, error: r.error, valores };
  try {
    await guardarHorasSueno(r.valor);
  } catch {
    return { envios, error: ERROR_CONEXION, valores };
  }
  refresh();
  return { envios };
}

// ---- Proyectos ----

export type ValoresFormProyecto = Record<
  "name" | "label" | "notes" | "url",
  string
>;

// Crear o cambiar un proyecto dentro de un área.
export async function guardarProyecto(
  prev: FormState<ValoresFormProyecto>,
  formData: FormData,
): Promise<FormState<ValoresFormProyecto>> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  const valores = {
    name: texto("name"),
    label: texto("label"),
    notes: texto("notes"),
    url: texto("url"),
  };
  const r = prepararProyecto(valores);
  if (!r.ok) return { envios, error: r.error, valores };

  const areaId = leerTexto(formData, "area_id");
  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarProyecto(id, r.valor);
    else await crearProyecto(areaId, r.valor);
  } catch {
    return { envios, error: ERROR_CONEXION, valores };
  }
  redirect(`/areas/${areaId}`);
}

export async function archivarProyecto(formData: FormData) {
  await exigirSesion();
  await cambiarProyecto(leerTexto(formData, "id"), {
    archived_at:
      formData.get("archivar") === "si" ? new Date().toISOString() : null,
  });
  refresh();
}

export async function eliminarProyecto(formData: FormData) {
  await exigirSesion();
  await borrarProyecto(leerTexto(formData, "id"));
  redirect(`/areas/${leerTexto(formData, "area_id")}`);
}

// Añade una tarea directamente dentro de un proyecto.
// Día, hora y minutos son opcionales: si no los pones, se quedan vacíos.
export type ValoresTareaProyecto = Record<
  "title" | "due_date" | "due_time" | "estimated_minutes" | "cuando",
  string
>;

export async function anadirTareaAProyecto(
  prev: FormState<ValoresTareaProyecto>,
  formData: FormData,
): Promise<FormState<ValoresTareaProyecto>> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  const valores = {
    title: texto("title"),
    due_date: texto("due_date"),
    due_time: texto("due_time"),
    estimated_minutes: texto("estimated_minutes"),
    cuando: texto("cuando"),
  };
  // Mismas reglas que al editar una tarea.
  const r = prepararCambiosTarea(valores);
  if (!r.ok) return { envios, error: r.error, valores };
  try {
    await crearTarea({
      ...r.valor,
      project_id: leerTexto(formData, "project_id"),
    });
  } catch {
    return { envios, error: ERROR_CONEXION, valores };
  }
  refresh();
  return { envios };
}
