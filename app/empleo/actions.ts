"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  borrarCandidatura,
  cambiarCandidatura,
  crearCandidatura,
} from "@/lib/data/candidaturas";
import {
  cambiosAlCambiarEstado,
  esEstado,
  prepararCandidatura,
  type DatosCandidatura,
} from "@/lib/planner/candidaturas";
import { createClient } from "@/lib/supabase/server";

// Acciones de las Candidaturas de empleo. Cada una comprueba primero que hay sesión.

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
export type ValoresFormCandidatura = Record<keyof DatosCandidatura, string>;
export type FormState = {
  envios: number;
  error?: string;
  valores?: ValoresFormCandidatura;
};

const CAMPOS: (keyof DatosCandidatura)[] = [
  "company",
  "role",
  "url",
  "status",
  "applied_on",
  "next_follow_up",
  "next_step",
  "notes",
];

// Crear o cambiar una candidatura (si el formulario trae "id", es cambiar).
export async function guardarCandidatura(
  prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = Object.fromEntries(
    CAMPOS.map((c) => [c, String(formData.get(c) ?? "")]),
  ) as ValoresFormCandidatura;
  const r = prepararCandidatura(valores);
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  let destino: string;
  try {
    if (typeof id === "string" && id !== "") {
      await cambiarCandidatura(id, r.valor);
      destino = `/empleo/${id}`;
    } else {
      destino = `/empleo/${await crearCandidatura(r.valor)}`;
    }
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      valores,
    };
  }
  redirect(destino);
}

// Botones rápidos de estado («Entrevista», «Rechazada»...).
export async function cambiarEstado(formData: FormData) {
  await exigirSesion();
  const estado = formData.get("status");
  if (!esEstado(estado)) throw new Error("Estado no válido.");
  await cambiarCandidatura(
    leerTexto(formData, "id"),
    cambiosAlCambiarEstado(estado),
  );
  refresh();
}

// «Seguimiento hecho»: quita el día de seguimiento para que deje de salir en Hoy.
// El siguiente lo pones tú cuando sepas cuándo toca.
export async function seguimientoHecho(formData: FormData) {
  await exigirSesion();
  await cambiarCandidatura(leerTexto(formData, "id"), {
    next_follow_up: null,
    next_step: null,
  });
  refresh();
}

export async function eliminarCandidatura(formData: FormData) {
  await exigirSesion();
  await borrarCandidatura(leerTexto(formData, "id"));
  redirect("/empleo");
}
