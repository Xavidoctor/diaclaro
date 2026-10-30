"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  borrarEvento,
  borrarExcepcion,
  cambiarEvento,
  crearEvento,
  guardarExcepcion,
  leerEvento,
} from "@/lib/data/agenda";
import {
  prepararCambioDia,
  prepararEvento,
  tocaEseDia,
} from "@/lib/planner/agenda";
import { esFecha } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// Acciones de la Agenda. Se ejecutan en el servidor al pulsar un botón,
// y cada una comprueba primero que hay sesión.

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

function datosDelFormulario(formData: FormData) {
  return prepararEvento({
    title: formData.get("title"),
    notes: formData.get("notes"),
    start_date: formData.get("start_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    part_of_day: formData.get("part_of_day"),
    repetir: formData.get("repetir"),
    dias: formData.getAll("dias"),
    hasta: formData.get("hasta"),
  });
}

// Si algo falla, "valores" devuelve lo escrito para no perderlo
// ("envios" cambia en cada intento y sirve para redibujar el formulario).
export type FormEventoState = {
  envios: number;
  error?: string;
  valores?: ValoresFormEvento;
};

export type ValoresFormEvento = Record<
  | "title"
  | "notes"
  | "start_date"
  | "start_time"
  | "end_time"
  | "part_of_day"
  | "repetir"
  | "hasta",
  string
> & { dias: string[] };

function valoresEscritos(formData: FormData): ValoresFormEvento {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  return {
    title: texto("title"),
    notes: texto("notes"),
    start_date: texto("start_date"),
    start_time: texto("start_time"),
    end_time: texto("end_time"),
    part_of_day: texto("part_of_day"),
    repetir: texto("repetir"),
    hasta: texto("hasta"),
    dias: formData.getAll("dias").map(String),
  };
}

// Crear o cambiar un evento (si el formulario trae "id", es cambiar).
export async function guardarEvento(
  prev: FormEventoState,
  formData: FormData,
): Promise<FormEventoState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const valores = valoresEscritos(formData);
  const r = datosDelFormulario(formData);
  if (!r.ok) return { envios, error: r.error, valores };

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") await cambiarEvento(id, r.valor);
    else await crearEvento(r.valor);
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      valores,
    };
  }
  // Vuelve a la agenda, empezando por el día del evento.
  redirect(`/agenda?desde=${r.valor.start_date}`);
}

export async function eliminarEvento(formData: FormData) {
  await exigirSesion();
  await borrarEvento(leerTexto(formData, "id"));
  redirect("/agenda");
}

// ---- Un solo día de un evento que se repite ----

// Comprueba que el día es de verdad uno de los días del evento.
async function eventoYDia(formData: FormData) {
  const evento = await leerEvento(leerTexto(formData, "id"));
  const dia = leerTexto(formData, "dia");
  if (!evento || !esFecha(dia) || !tocaEseDia(evento, dia)) {
    throw new Error("Ese día no corresponde a este evento.");
  }
  return { evento, dia };
}

export async function cancelarDia(formData: FormData) {
  await exigirSesion();
  const { evento, dia } = await eventoYDia(formData);
  await guardarExcepcion(evento.id, dia, { cancelled: true });
  refresh();
}

export async function deshacerCambioDia(formData: FormData) {
  await exigirSesion();
  const { evento, dia } = await eventoYDia(formData);
  await borrarExcepcion(evento.id, dia);
  refresh();
}

export type CambioDiaState = { error?: string; guardado?: boolean };

export async function moverDia(
  _prev: CambioDiaState,
  formData: FormData,
): Promise<CambioDiaState> {
  await exigirSesion();
  const r = prepararCambioDia({
    new_date: formData.get("new_date"),
    new_start_time: formData.get("new_start_time"),
    new_end_time: formData.get("new_end_time"),
  });
  if (!r.ok) return { error: r.error };
  try {
    const { evento, dia } = await eventoYDia(formData);
    await guardarExcepcion(evento.id, dia, { cancelled: false, ...r.valor });
  } catch {
    return { error: "No se ha podido guardar el cambio de ese día." };
  }
  refresh();
  return { guardado: true };
}
