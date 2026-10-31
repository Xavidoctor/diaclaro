"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/areas/actions";
import { crearTarea } from "@/lib/data/bandeja";
import {
  borrarMeta,
  cambiarMeta,
  crearMeta,
  leerMeta,
  marcarMeta,
} from "@/lib/data/metas";
import { prepararMeta, tituloTareaDeMeta } from "@/lib/planner/metas";
import { createClient } from "@/lib/supabase/server";

// Acciones de las metas de los proyectos. Cada una comprueba primero que hay sesión.

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

export type ValoresFormMeta = Record<
  "title" | "kind" | "due_date" | "aviso_dia" | "aviso_hora",
  string
>;

// Crear o cambiar una meta (si el formulario trae "id", es cambiar).
export async function guardarMeta(
  prev: FormState<ValoresFormMeta>,
  formData: FormData,
): Promise<FormState<ValoresFormMeta>> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  const valores = {
    title: texto("title"),
    kind: texto("kind"),
    due_date: texto("due_date"),
    aviso_dia: texto("aviso_dia"),
    aviso_hora: texto("aviso_hora"),
  };
  const r = prepararMeta(valores);
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarMeta(id, r.valor);
    else await crearMeta(leerTexto(formData, "project_id"), r.valor);
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      valores,
    };
  }
  refresh();
  return { envios };
}

// Marca la meta como conseguida (o la vuelve a dejar pendiente).
export async function marcarMetaHecha(formData: FormData) {
  await exigirSesion();
  await marcarMeta(leerTexto(formData, "id"), formData.get("hecha") === "si");
  refresh();
}

// Crea en el proyecto una tarea para preparar la meta, con la fecha de la
// meta como fecha dura: así el aviso de sobrecarga nunca la recorta y la
// sube arriba cuando se acerca. Los minutos los pones tú en la tarea.
export async function crearTareaDeMeta(formData: FormData) {
  await exigirSesion();
  const meta = await leerMeta(leerTexto(formData, "id"));
  if (!meta || !meta.due_date) return;
  await crearTarea({
    title: tituloTareaDeMeta(meta),
    project_id: meta.project_id,
    due_date: meta.due_date,
    hard_deadline: true,
  });
  refresh();
}

export async function eliminarMeta(formData: FormData) {
  await exigirSesion();
  await borrarMeta(leerTexto(formData, "id"));
  refresh();
}
