"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  leerCambios,
  MAX_TEXTO_CAMBIO,
  mensajesAlgoHaCambiado,
  textoCambio,
  valorCambio,
  type EventoParaIA,
  type TareaParaIA,
} from "@/lib/ai/algo-ha-cambiado";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import {
  guardarExcepcion,
  listarEventosHasta,
  listarExcepciones,
} from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { cambiarTarea, listarTareas } from "@/lib/data/bandeja";
import { apuntarUsoIA, MAX_USOS_IA_DIA } from "@/lib/data/uso-ia";
import { ocurrenciasEntre } from "@/lib/planner/agenda";
import { hoyEn, sumarDias } from "@/lib/planner/fechas";
import { leerCambioAceptado } from "@/lib/planner/propuestas";
import { createClient } from "@/lib/supabase/server";

// Acciones de «Algo ha cambiado». La IA solo propone cambios; cada uno se
// aplica cuando pulsas su «Aceptar», y se vuelve a comprobar aquí.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

// Tu agenda de las próximas 3 semanas (sin Google: eso no se puede cambiar
// desde aquí) y tus tareas pendientes.
async function loQueTienes(hoy: string) {
  const hasta = sumarDias(hoy, 20);
  const [lista, tareas] = await Promise.all([
    listarEventosHasta(hasta),
    listarTareas(false),
  ]);
  const excepciones = await listarExcepciones(lista.map((e) => e.id));
  const eventos: EventoParaIA[] = ocurrenciasEntre(
    lista,
    excepciones,
    hoy,
    hasta,
  ).map((o) => ({
    eventoId: o.eventoId,
    fechaOriginal: o.fechaOriginal,
    titulo: o.titulo,
    fecha: o.fecha,
    hora: o.horaInicio,
    horaFin: o.horaFin,
  }));
  const pendientes: TareaParaIA[] = tareas
    .filter((t) => !t.done_at && !t.deleted_at)
    .map((t) => ({ id: t.id, titulo: t.title, fecha: t.due_date }));
  return { eventos, tareas: pendientes };
}

export type PropuestaCambio = { valor: string; texto: string };

export type CambioState = {
  texto?: string;
  cambios?: PropuestaCambio[];
  descartados?: number;
  error?: string;
  intento: number;
};

export async function interpretarCambio(
  prev: CambioState,
  formData: FormData,
): Promise<CambioState> {
  await exigirSesion();
  const intento = prev.intento + 1;
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { intento, error: "Cuéntame qué ha cambiado." };
  if (texto.length > MAX_TEXTO_CAMBIO)
    return {
      intento,
      texto,
      error: `Como mucho ${MAX_TEXTO_CAMBIO} caracteres.`,
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

  const { eventos, tareas } = await loQueTienes(hoy);
  const datos = { texto, hoy, eventos, tareas };
  const mensajes = mensajesAlgoHaCambiado(datos);
  const respuesta =
    (await pedirTexto(mensajes, { json: true })) ??
    (await pedirTexto(mensajes));
  const r = respuesta ? leerCambios(respuesta, datos) : null;
  if (!r)
    return {
      intento,
      texto,
      error:
        "La IA no ha respondido bien. Prueba otra vez o cámbialo a mano en la Agenda o en Tareas.",
    };
  if (r.cambios.length === 0)
    return {
      intento,
      texto,
      error:
        "No he encontrado nada de tu agenda o tus tareas que cambiar. Si es algo nuevo, apúntalo con «Ordenar con IA».",
    };
  return {
    intento,
    texto,
    descartados: r.descartados,
    cambios: r.cambios.map((c) => ({
      valor: valorCambio(c),
      texto: textoCambio(c),
    })),
  };
}

export type AplicarState = { hecho?: boolean; error?: string };

// Botón «Aceptar» de un cambio.
export async function aplicarCambio(
  _prev: AplicarState,
  formData: FormData,
): Promise<AplicarState> {
  await exigirSesion();
  const cambio = leerCambioAceptado(formData.get("cambio"));
  if (!cambio) return { error: "Este cambio no es válido." };
  try {
    if (cambio.tipo === "cancelar")
      await guardarExcepcion(cambio.eventoId, cambio.dia, { cancelled: true });
    else if (cambio.tipo === "mover")
      await guardarExcepcion(cambio.eventoId, cambio.dia, {
        cancelled: false,
        ...cambio.cambio,
      });
    else await cambiarTarea(cambio.id, { due_date: cambio.fecha });
  } catch {
    return { error: "No se ha podido guardar. Prueba otra vez." };
  }
  refresh();
  return { hecho: true };
}
