"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { proyectosParaIA } from "@/app/componentes/proyectos-ia";
import { leerPasos, mensajesDividirTarea } from "@/lib/ai/dividir-tarea";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import {
  leerSugerencia,
  mensajesSugerirProyecto,
} from "@/lib/ai/sugerir-proyecto";
import {
  cambiarNota,
  crearTarea,
  leerNota,
  leerTarea,
} from "@/lib/data/bandeja";
import { apuntarUsoIA, topeIA } from "@/lib/data/uso-ia";
import { prepararProyectoDeTarea } from "@/lib/planner/areas";
import { detallePaso, prepararPasos, textoPasos } from "@/lib/planner/pasos";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

// «Sugerir proyecto» en una nota de la Bandeja. La IA solo propone
// (primera acción); la nota cambia cuando tú pulsas «Poner en …» (segunda).

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export type SugerenciaState = {
  proyecto?: { id: string; nombre: string };
  ninguno?: boolean; // la IA cree que no encaja en ninguno
  motivo?: string;
  hecho?: boolean;
  error?: string;
};

export async function sugerirProyecto(
  _prev: SugerenciaState,
  formData: FormData,
): Promise<SugerenciaState> {
  await exigirSesion();
  if (!iaDisponible()) return { error: "La IA no está configurada." };

  // La nota se lee aquí, en el servidor: el navegador solo manda su id.
  const id = formData.get("id");
  const nota = typeof id === "string" && id ? await leerNota(id) : null;
  if (!nota) return { error: "No encuentro esta nota." };
  const proyectos = await proyectosParaIA();
  if (proyectos.length === 0)
    return { error: "Aún no tienes proyectos. Créalos en Áreas." };

  const hoy = await diaDeHoy();
  if (!(await apuntarUsoIA(hoy)))
    return {
      error: `Hoy ya has usado la IA ${await topeIA()} veces. Mañana vuelve a estar disponible.`,
    };

  const mensajes = mensajesSugerirProyecto({ nota: nota.body, proyectos });
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const sugerencia = respuesta ? leerSugerencia(respuesta, proyectos) : null;
  if (!sugerencia)
    return { error: "La IA no ha respondido bien. Prueba otra vez." };

  const motivo = sugerencia.motivo ?? undefined;
  if (!sugerencia.proyecto) return { ninguno: true, motivo };
  const { id: proyectoId, nombre } = sugerencia.proyecto;
  return { proyecto: { id: proyectoId, nombre }, motivo };
}

// Guarda el proyecto que has aceptado. Se comprueba otra vez que es uno de
// tus proyectos activos: no basta con lo que mande el navegador.
export async function ponerProyecto(
  prev: SugerenciaState,
  formData: FormData,
): Promise<SugerenciaState> {
  await exigirSesion();
  const id = formData.get("id");
  const p = prepararProyectoDeTarea(formData.get("project_id"));
  if (typeof id !== "string" || !id || !p.ok || !p.valor)
    return { ...prev, error: "No se ha podido guardar." };
  const proyectos = await proyectosParaIA();
  if (!proyectos.some((x) => x.id === p.valor))
    return { ...prev, error: "Ese proyecto ya no existe." };
  await cambiarNota(id, { project_id: p.valor });
  refresh();
  return { ...prev, hecho: true, error: undefined };
}

// «Divide esta tarea en pasos». La IA propone los pasos (primera acción) y tú
// los revisas en un cuadro de texto; se guardan como tareas cuando pulsas
// «Guardar pasos» (segunda). Cada paso copia el día y el proyecto de la tarea,
// sin inventar horas ni minutos.

export type PasosState = {
  texto?: string; // los pasos propuestos, uno por línea, para que los edites
  noHaceFalta?: boolean; // la IA cree que ya es un paso sencillo
  guardados?: number;
  error?: string;
};

export async function proponerPasos(
  _prev: PasosState,
  formData: FormData,
): Promise<PasosState> {
  await exigirSesion();
  if (!iaDisponible()) return { error: "La IA no está configurada." };

  const id = formData.get("id");
  const tarea = typeof id === "string" && id ? await leerTarea(id) : null;
  if (!tarea || tarea.deleted_at || tarea.done_at)
    return { error: "No encuentro esta tarea." };

  const hoy = await diaDeHoy();
  if (!(await apuntarUsoIA(hoy)))
    return {
      error: `Hoy ya has usado la IA ${await topeIA()} veces. Mañana vuelve a estar disponible.`,
    };

  const mensajes = mensajesDividirTarea({
    titulo: tarea.title,
    detalles: tarea.details,
  });
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const pasos = respuesta ? leerPasos(respuesta) : null;
  if (!pasos) return { error: "La IA no ha respondido bien. Prueba otra vez." };
  if (pasos.length === 0) return { noHaceFalta: true };
  return { texto: textoPasos(pasos) };
}

export async function guardarPasos(
  prev: PasosState,
  formData: FormData,
): Promise<PasosState> {
  await exigirSesion();
  const id = formData.get("id");
  const tarea = typeof id === "string" && id ? await leerTarea(id) : null;
  if (!tarea || tarea.deleted_at)
    return { ...prev, error: "No encuentro esta tarea." };
  const pasos = prepararPasos(formData.get("pasos"));
  if (pasos.length === 0)
    return { ...prev, error: "Escribe al menos un paso." };

  // Uno detrás de otro, para que salgan en orden.
  for (const [i, paso] of pasos.entries()) {
    await crearTarea({
      title: paso,
      details: detallePaso(i + 1, pasos.length, tarea.title),
      due_date: tarea.due_date,
      project_id: tarea.project_id,
    });
  }
  refresh();
  return { guardados: pasos.length };
}
