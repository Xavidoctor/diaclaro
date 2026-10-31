"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  borrarNotaDefinitiva,
  borrarTareaDefinitiva,
  cambiarNota,
  cambiarTarea,
  crearNota,
  crearTarea,
  leerNota,
  moverTareas,
} from "@/lib/data/bandeja";
import { prepararProyectoDeTarea } from "@/lib/planner/areas";
import {
  leerDiaParaMover,
  leerIds,
  prepararCambiosTarea,
  prepararCaptura,
  primerEnlace,
  tareaDesdeNota,
} from "@/lib/planner/bandeja";
import {
  esTipoNota,
  extraerEtiquetas,
  leerCampoEtiquetas,
  tipoInicial,
} from "@/lib/planner/etiquetas";
import { enlaceOpcional } from "@/lib/planner/enlaces";
import { leerImportancia } from "@/lib/planner/recortes";
import { leerMinutosReales } from "@/lib/planner/tiempos";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

// Acciones de la Bandeja. Se ejecutan en el servidor cuando pulsas un botón.
// Cada una comprueba primero que hay sesión: se pueden llamar desde fuera de la app.

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

// Guarda lo capturado: como nota (con sus #etiquetas) o como tarea.
async function guardarCaptura(
  texto: string,
  url: string | null,
  destino: unknown,
) {
  if (destino === "tarea") {
    const { title, details } = tareaDesdeNota(texto);
    await crearTarea({ title, details });
  } else {
    await crearNota({
      body: texto,
      url,
      kind: tipoInicial(texto, url),
      tags: extraerEtiquetas(texto),
    });
  }
}

// "envios" cambia en cada intento: sirve para redibujar el cuadro de texto.
// Si algo falla, "texto" devuelve lo escrito para no perderlo.
export type CapturaState = {
  envios: number;
  error?: string;
  texto?: string;
};

// El cuadro de captura: guarda el texto como nota (o como tarea en la pestaña Tareas).
export async function capturar(
  prev: CapturaState,
  formData: FormData,
): Promise<CapturaState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const escrito = String(formData.get("texto") ?? "");
  const r = prepararCaptura(escrito);
  if (!r.ok) return { envios, error: r.error, texto: escrito };

  try {
    await guardarCaptura(r.valor.texto, r.valor.url, formData.get("destino"));
  } catch {
    return {
      envios,
      error: "No se ha podido guardar. Revisa la conexión y vuelve a probar.",
      texto: escrito,
    };
  }

  refresh();
  return { envios };
}

// Envía una captura que se hizo sin conexión y esperaba en el móvil.
// Devuelve true si se ha guardado (o si no se podrá guardar nunca, para no reintentar siempre).
export async function enviarPendiente(pendiente: {
  texto: string;
  destino: "nota" | "tarea";
}): Promise<boolean> {
  await exigirSesion();
  const r = prepararCaptura(pendiente.texto);
  if (!r.ok) return true;
  try {
    await guardarCaptura(r.valor.texto, r.valor.url, pendiente.destino);
  } catch {
    return false;
  }
  refresh();
  return true;
}

// ---- Notas ----

export async function fijarNota(formData: FormData) {
  await exigirSesion();
  await cambiarNota(leerId(formData), {
    pinned: formData.get("fijar") === "si",
  });
  refresh();
}

export async function archivarNota(formData: FormData) {
  await exigirSesion();
  const archivar = formData.get("archivar") === "si";
  await cambiarNota(leerId(formData), {
    archived_at: archivar ? new Date().toISOString() : null,
  });
  refresh();
}

export async function papeleraNota(formData: FormData) {
  await exigirSesion();
  const tirar = formData.get("tirar") === "si";
  await cambiarNota(leerId(formData), {
    deleted_at: tirar ? new Date().toISOString() : null,
  });
  refresh();
}

export async function borrarNota(formData: FormData) {
  await exigirSesion();
  await borrarNotaDefinitiva(leerId(formData));
  refresh();
}

export async function editarNota(formData: FormData) {
  await exigirSesion();
  const r = prepararCaptura(formData.get("texto"));
  // Si el texto queda vacío, no se guarda: así no se pierde la nota por error.
  if (!r.ok) return;
  const tipo = formData.get("tipo");
  // El proyecto solo se cambia si el formulario trae el selector.
  const proyecto = formData.has("project_id")
    ? prepararProyectoDeTarea(formData.get("project_id"))
    : null;
  await cambiarNota(leerId(formData), {
    body: r.valor.texto,
    ...(proyecto?.ok ? { project_id: proyecto.valor } : {}),
    url: primerEnlace(r.valor.texto),
    tags: leerCampoEtiquetas(formData.get("etiquetas")),
    ...(esTipoNota(tipo) ? { kind: tipo } : {}),
  });
  refresh();
}

// Crea una tarea a partir de la nota. La nota conserva su texto intacto,
// queda enlazada a la tarea y pasa al archivo (ya está decidida).
// Si la nota tenía un enlace, la tarea se lo queda para abrirlo desde Hoy.
export async function convertirEnTarea(formData: FormData) {
  await exigirSesion();
  const nota = await leerNota(leerId(formData));
  if (!nota) return;
  const { title, details } = tareaDesdeNota(nota.body);
  await crearTarea({ title, details, note_id: nota.id, url: nota.url });
  await cambiarNota(nota.id, { archived_at: new Date().toISOString() });
  refresh();
}

// ---- Tareas ----

// Marca una tarea como hecha (con los minutos que has tardado, si los dices)
// o la devuelve a pendiente (y entonces se borran esos minutos).
export async function marcarTarea(formData: FormData) {
  await exigirSesion();
  const hecha = formData.get("hecha") === "si";
  const minutos = formData.get("minutos");
  await cambiarTarea(leerId(formData), {
    done_at: hecha ? new Date().toISOString() : null,
    actual_minutes: hecha
      ? leerMinutosReales(minutos === "otros" ? formData.get("otros") : minutos)
      : null,
  });
  refresh();
}

export type EditarTareaState = { error?: string; guardado?: boolean };

export async function editarTarea(
  _prev: EditarTareaState,
  formData: FormData,
): Promise<EditarTareaState> {
  await exigirSesion();
  const r = prepararCambiosTarea({
    title: formData.get("title"),
    due_date: formData.get("due_date"),
    due_time: formData.get("due_time"),
    estimated_minutes: formData.get("estimated_minutes"),
    cuando: formData.get("cuando"),
  });
  if (!r.ok) return { error: r.error };
  // El proyecto solo se cambia si el formulario trae el selector.
  const cambios: Parameters<typeof cambiarTarea>[1] = { ...r.valor };
  if (formData.has("project_id")) {
    const p = prepararProyectoDeTarea(formData.get("project_id"));
    if (!p.ok) return { error: p.error };
    cambios.project_id = p.valor;
  }
  // Importancia y fecha dura sirven para saber qué se puede recortar.
  if (formData.has("importance")) {
    cambios.importance = leerImportancia(formData.get("importance"));
    cambios.hard_deadline = formData.get("hard_deadline") === "si";
  }
  // El enlace (un podcast, una clase…) solo se cambia si el formulario lo trae.
  if (formData.has("url")) {
    const enlace = enlaceOpcional.safeParse(formData.get("url"));
    if (!enlace.success) return { error: enlace.error.issues[0].message };
    cambios.url = enlace.data;
  }
  await cambiarTarea(leerId(formData), cambios);
  refresh();
  return { guardado: true };
}

export async function papeleraTarea(formData: FormData) {
  await exigirSesion();
  const tirar = formData.get("tirar") === "si";
  await cambiarTarea(leerId(formData), {
    deleted_at: tirar ? new Date().toISOString() : null,
  });
  refresh();
}

export async function borrarTarea(formData: FormData) {
  await exigirSesion();
  await borrarTareaDefinitiva(leerId(formData));
  refresh();
}

// Lleva una o varias tareas a otro día: a hoy o al que elijas en el calendario.
// En el formulario van "ids" (separados por comas) y "dia".
export type MoverTareasState = { error?: string };

export async function moverTareasA(
  _prev: MoverTareasState,
  formData: FormData,
): Promise<MoverTareasState> {
  await exigirSesion();
  const ids = leerIds(formData.get("ids"));
  if (ids.length === 0) return { error: "No hay ninguna tarea que mover." };
  const dia = leerDiaParaMover(formData.get("dia"), await diaDeHoy());
  if (!dia.ok) return { error: dia.error };
  try {
    await moverTareas(ids, dia.valor);
  } catch {
    return { error: "No se ha podido mover. Vuelve a probar." };
  }
  refresh();
  return {};
}

// Crea una tarea ya apuntada para un día (desde el calendario de la Agenda).
// Los minutos son opcionales: si no los pones, se quedan vacíos.
export type TareaParaDiaState = { envios: number; error?: string };

export async function crearTareaParaDia(
  prev: TareaParaDiaState,
  formData: FormData,
): Promise<TareaParaDiaState> {
  await exigirSesion();
  const envios = prev.envios + 1;
  const r = prepararCambiosTarea({
    title: formData.get("title"),
    due_date: formData.get("due_date"),
    due_time: formData.get("due_time"),
    estimated_minutes: formData.get("estimated_minutes"),
  });
  if (!r.ok) return { envios, error: r.error };
  try {
    await crearTarea(r.valor);
  } catch {
    return { envios, error: "No se ha podido guardar. Vuelve a probar." };
  }
  refresh();
  return { envios };
}
