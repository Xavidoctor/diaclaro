"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { leerAjustes } from "@/lib/data/ajustes";
import {
  anadirAlHistorial,
  borrarCandidatura,
  borrarDelHistorial,
  cambiarCandidatura,
  crearCandidatura,
  leerCandidatura,
} from "@/lib/data/candidaturas";
import {
  cambiosAlCambiarEstado,
  entradaCambioEstado,
  entradaSeguimientoHecho,
  esEstado,
  prepararCandidatura,
  prepararNotaHistorial,
  type DatosCandidatura,
} from "@/lib/planner/candidaturas";
import { hoyEn } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// Acciones de las Candidaturas de empleo. Cada una comprueba primero que hay sesión.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// El día de hoy en tu zona horaria (la de Ajustes).
async function hoy() {
  const { timezone } = await leerAjustes();
  return hoyEn(timezone);
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
  "area_id",
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
// El cambio se apunta solo en el historial, con el día de hoy.
export async function cambiarEstado(formData: FormData) {
  await exigirSesion();
  const estado = formData.get("status");
  if (!esEstado(estado)) throw new Error("Estado no válido.");
  const id = leerTexto(formData, "id");
  await cambiarCandidatura(id, cambiosAlCambiarEstado(estado));
  await anadirAlHistorial(id, entradaCambioEstado(estado, await hoy()));
  refresh();
}

// «Seguimiento hecho»: quita el día de seguimiento para que deje de salir en Hoy
// y lo apunta en el historial. El siguiente lo pones tú cuando sepas cuándo toca.
export async function seguimientoHecho(formData: FormData) {
  await exigirSesion();
  const id = leerTexto(formData, "id");
  const candidatura = await leerCandidatura(id);
  if (!candidatura) throw new Error("No existe esa candidatura.");
  await cambiarCandidatura(id, { next_follow_up: null, next_step: null });
  await anadirAlHistorial(
    id,
    entradaSeguimientoHecho(candidatura, await hoy()),
  );
  refresh();
}

// Una nota tuya en el historial («Me han llamado», «Les mandé el portfolio»...).
export type FormStateNota = {
  envios: number;
  error?: string;
  valores?: { on_date: string; note: string; minutos: string };
};

export async function apuntarEnHistorial(
  prev: FormStateNota,
  formData: FormData,
): Promise<FormStateNota> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = {
    on_date: String(formData.get("on_date") ?? ""),
    note: String(formData.get("note") ?? ""),
    minutos: String(formData.get("minutos") ?? ""),
  };
  const r = prepararNotaHistorial(valores, await hoy());
  if (!r.ok) return { envios, error: r.error, valores };
  try {
    await anadirAlHistorial(leerTexto(formData, "id"), r.valor);
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

export async function quitarDelHistorial(formData: FormData) {
  await exigirSesion();
  await borrarDelHistorial(leerTexto(formData, "entrada"));
  refresh();
}

export async function eliminarCandidatura(formData: FormData) {
  await exigirSesion();
  await borrarCandidatura(leerTexto(formData, "id"));
  redirect("/empleo");
}
