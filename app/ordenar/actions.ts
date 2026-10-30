"use server";

import { refresh } from "next/cache";
import { proyectosParaIA } from "@/app/componentes/proyectos-ia";
import { redirect } from "next/navigation";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import {
  leerRespuesta,
  MAX_TEXTO_IA,
  mensajesInterpretar,
  type Propuesta,
} from "@/lib/ai/interpretar-texto";
import { crearEvento } from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { crearNota, crearTarea } from "@/lib/data/bandeja";
import { apuntarUsoIA, MAX_USOS_IA_DIA } from "@/lib/data/uso-ia";
import { primerEnlace } from "@/lib/planner/bandeja";
import { extraerEtiquetas, tipoInicial } from "@/lib/planner/etiquetas";
import { hoyEn } from "@/lib/planner/fechas";
import { leerElementos, textoGuardado } from "@/lib/planner/propuestas";
import { createClient } from "@/lib/supabase/server";

// Acciones de «Ordenar con IA». La IA solo propone (primera acción);
// lo que se guarda es lo que tú revisas y marcas (segunda acción).

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export type InterpretarState = {
  texto?: string;
  propuestas?: Propuesta[];
  error?: string;
  intento: number; // cambia en cada respuesta, para redibujar la lista
};

export async function interpretar(
  prev: InterpretarState,
  formData: FormData,
): Promise<InterpretarState> {
  await exigirSesion();
  const intento = prev.intento + 1;
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { intento, error: "Escribe algo para ordenar." };
  if (texto.length > MAX_TEXTO_IA)
    return {
      intento,
      texto,
      error: `Como mucho ${MAX_TEXTO_IA} caracteres de una vez.`,
    };
  if (!iaDisponible())
    return { intento, texto, error: "La IA no está configurada." };

  const hoy = hoyEn((await leerAjustes()).timezone);
  if (!(await apuntarUsoIA(hoy)))
    return {
      intento,
      texto,
      error: `Hoy ya has usado la IA ${MAX_USOS_IA_DIA} veces. Mañana vuelve a estar disponible.`,
    };

  const proyectos = await proyectosParaIA();
  const mensajes = mensajesInterpretar({ texto, hoy, proyectos });
  // Si el modelo no admite el modo JSON, se repite sin él (la app sabe
  // sacar el JSON aunque venga con texto alrededor).
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const propuestas = respuesta
    ? leerRespuesta(respuesta, { texto, hoy, proyectos })
    : null;
  if (!propuestas)
    return {
      intento,
      texto,
      error:
        "La IA no ha respondido bien. Prueba otra vez o apúntalo a mano en la Bandeja.",
    };
  if (propuestas.length === 0)
    return {
      intento,
      texto,
      error: "La IA no ha encontrado nada que apuntar.",
    };
  return { intento, texto, propuestas };
}

export type GuardarState = { error?: string; hecho?: string };

export async function guardarPropuestas(
  _prev: GuardarState,
  formData: FormData,
): Promise<GuardarState> {
  await exigirSesion();
  const r = leerElementos((campo) => formData.get(campo));
  if (!r.ok) return { error: r.error };

  try {
    for (const e of r.valor) {
      if (e.tipo === "nota") {
        const url = primerEnlace(e.body);
        await crearNota({
          body: e.body,
          url,
          kind: tipoInicial(e.body, url),
          tags: extraerEtiquetas(e.body),
        });
      } else if (e.tipo === "tarea") {
        await crearTarea({
          title: e.title,
          details: e.details,
          due_date: e.due_date,
          estimated_minutes: e.estimated_minutes,
          project_id: e.project_id,
        });
      } else {
        await crearEvento({
          title: e.title,
          notes: e.notes,
          start_date: e.start_date,
          start_time: e.start_time,
          end_time: e.end_time,
          part_of_day: null,
          repeat_rule: null,
        });
      }
    }
  } catch {
    return {
      error:
        "No se ha podido guardar todo. Revisa la Bandeja y la Agenda antes de repetir, por si algo ya se guardó.",
    };
  }
  refresh();
  return { hecho: textoGuardado(r.valor) };
}
