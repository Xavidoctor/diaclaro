"use server";

import { redirect } from "next/navigation";
import { cargarDiaDificil } from "@/app/dia-dificil/situacion";
import {
  leerMotivoIA,
  MAX_TEXTO_DIA,
  mensajesElegirMotivo,
  mensajesExplicarDia,
} from "@/lib/ai/dia-dificil";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import { leerAjustes } from "@/lib/data/ajustes";
import { apuntarUsoIA, topeIA } from "@/lib/data/uso-ia";
import { leerMotivo } from "@/lib/planner/dia-dificil";
import { hoyEn } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// La IA en el Día difícil. Solo elige el motivo o explica con palabras:
// la propuesta la calcula siempre la app y nada cambia hasta que aceptas.

async function prepararIA(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (!iaDisponible()) return "La IA no está configurada.";
  const hoy = hoyEn((await leerAjustes()).timezone);
  if (!(await apuntarUsoIA(hoy)))
    return `Hoy ya has usado la IA ${await topeIA()} veces. Elige el motivo con los botones.`;
  return null;
}

export type ContarState = { texto?: string; error?: string };

// «Cuéntamelo con tus palabras»: la IA elige el motivo y te lleva a la propuesta.
export async function contarConIA(
  _prev: ContarState,
  formData: FormData,
): Promise<ContarState> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { error: "Cuéntame en una frase qué ha pasado." };
  if (texto.length > MAX_TEXTO_DIA)
    return { texto, error: `Como mucho ${MAX_TEXTO_DIA} caracteres.` };
  const error = await prepararIA();
  if (error) return { texto, error };

  const mensajes = mensajesElegirMotivo(texto);
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const motivo = respuesta ? leerMotivoIA(respuesta) : null;
  if (!motivo)
    return {
      texto,
      error: "No lo he entendido bien. Elige el motivo con los botones.",
    };
  redirect(`/dia-dificil?motivo=${motivo}`);
}

export type ExplicarDiaState = { texto?: string; error?: string };

// «Explícamelo con IA»: te cuenta con palabras la propuesta de la app.
export async function explicarDiaConIA(
  _prev: ExplicarDiaState,
  formData: FormData,
): Promise<ExplicarDiaState> {
  const motivo = leerMotivo(formData.get("motivo"));
  if (!motivo) return { error: "Falta el motivo." };
  const error = await prepararIA();
  if (error) return { error };

  const { agenda, pendientes, propuesta } = await cargarDiaDificil(motivo);
  const texto = await pedirTexto(
    mensajesExplicarDia({
      motivo,
      agenda: agenda.map((o) => o.titulo),
      rutinas: pendientes.map((r) => r.rutina.title),
      conservar: propuesta.conservar.map((c) => ({
        titulo: c.tarea.title,
        motivo: c.motivo,
      })),
      reducir: propuesta.reducir.map((r) => ({
        titulo: r.tarea.title,
        de: r.tarea.estimated_minutes ?? 0,
        a: r.nuevosMinutos,
      })),
      aplazar: propuesta.aplazar.map((a) => ({ titulo: a.tarea.title })),
      ahorro: propuesta.ahorro,
    }),
  );
  if (!texto)
    return {
      error:
        "La IA no responde ahora mismo. La propuesta de abajo sigue siendo válida.",
    };
  return { texto };
}
