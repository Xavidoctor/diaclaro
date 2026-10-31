"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  apuntarHabito,
  borrarHabito,
  cambiarHabito,
  crearHabito,
  leerHabito,
  quitarUltimoApunte,
} from "@/lib/data/habitos";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import { leerFrases, mensajesFrasesHabito } from "@/lib/ai/frases-habito";
import { apuntarUsoIA, topeIA } from "@/lib/data/uso-ia";
import {
  anadirFrase,
  prepararApunte,
  prepararHabito,
  quitarFrase,
} from "@/lib/planner/habitos";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

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
  return await diaDeHoy();
}

// ---- Crear y cambiar hábitos ----

export type ValoresFormHabito = Record<
  | "title"
  | "notes"
  | "direction"
  | "unit"
  | "daily_target"
  | "cuando"
  | "routine_id"
  | "remind_at"
  | "url",
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
    remind_at: texto("remind_at"),
    url: texto("url"),
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

// ---- Frases para motivarte ----

export type FraseState = { envios: number; error?: string; guardada?: string };

// Añade una frase (escrita por ti o una idea de la IA que has elegido).
// Las frases que ya tienes se leen aquí, en el servidor.
export async function guardarFrase(
  prev: FraseState,
  formData: FormData,
): Promise<FraseState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const habito = await leerHabito(leerId(formData));
  if (!habito) return { envios, error: "No encuentro este hábito." };
  const frase = formData.get("frase");
  const r = anadirFrase(habito.phrases, frase);
  if (!r.ok) return { envios, error: r.error };
  try {
    await cambiarHabito(habito.id, { phrases: r.valor });
  } catch {
    return { envios, error: "No se ha podido guardar. Revisa la conexión." };
  }
  refresh();
  return { envios, guardada: String(frase).trim() };
}

export async function borrarFrase(formData: FormData) {
  await exigirSesion();
  const habito = await leerHabito(leerId(formData));
  if (!habito) return;
  await cambiarHabito(habito.id, {
    phrases: quitarFrase(habito.phrases, formData.get("frase")),
  });
  refresh();
}

export type IdeasState = { ideas?: string[]; error?: string };

// Pide ideas de frases a la IA. Solo propone: no se guarda ninguna hasta que
// pulsas «Guardar». A la IA solo le llega el nombre del hábito y lo que quieres.
export async function pedirIdeasDeFrases(
  _prev: IdeasState,
  formData: FormData,
): Promise<IdeasState> {
  await exigirSesion();
  if (!iaDisponible()) return { error: "La IA no está configurada." };
  const habito = await leerHabito(leerId(formData));
  if (!habito) return { error: "No encuentro este hábito." };
  if (!(await apuntarUsoIA(await hoy())))
    return {
      error: `Hoy ya has usado la IA ${await topeIA()} veces. Mañana vuelve a estar disponible.`,
    };

  const mensajes = mensajesFrasesHabito({
    titulo: habito.title,
    direccion: habito.direction,
  });
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const ideas = respuesta ? leerFrases(respuesta) : null;
  if (!ideas) return { error: "La IA no ha respondido bien. Prueba otra vez." };
  // No enseña las que ya tienes guardadas.
  const tuyas = new Set(habito.phrases.map((f) => f.toLowerCase()));
  return { ideas: ideas.filter((f) => !tuyas.has(f.toLowerCase())) };
}
