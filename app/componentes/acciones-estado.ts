"use server";

import { paseDrive } from "@/app/documentos/pase-drive";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarNotas, listarTareas } from "@/lib/data/bandeja";
import { leerPerfil } from "@/lib/data/perfil";
import { leerSecciones } from "@/lib/data/secciones";
import { cargarProgreso } from "@/lib/data/progreso";
import { listarImportantes } from "@/lib/google/api";
import { leerDocumentoDrive } from "@/lib/planner/documentos-importantes";
import type { DocumentoImportante } from "@/lib/planner/documentos-importantes";
import { sumarDias } from "@/lib/planner/fechas";
import {
  cuandoTocaTarea,
  notasFijadas,
  ordenarCartera,
  resumenNota,
  tareasPorHacer,
} from "@/lib/planner/panel-estado";
import type { Media } from "@/lib/planner/progreso";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

// Lo que enseña el panel «Tu estado». Se carga solo cuando lo abres, para
// que el resto de pantallas no vayan más lentas.
// Cada parte va por separado: si una falla, las demás se ven igual.

export type EstadoProgreso = {
  hoy: { usado: number; sinApuntar: number | null; enPie: number | null };
  sueno: Media; // media de los últimos 7 días
  usado: Media;
  sinApuntar: Media;
};

export type EstadoDocumentos =
  | { estado: "ok"; lista: DocumentoImportante[]; total: number }
  | { estado: "sin-drive" | "no-disponible" | "fallo" };

export type NotaPanel = { id: string; texto: string; fijada: boolean };

// Una tarea pendiente en el panel: "cuando" es "Hoy", "Mañana", "De ayer"...
export type TareaPanel = {
  id: string;
  titulo: string;
  cuando: string;
  hora: string | null;
  atrasada: boolean;
  previstos: number | null; // minutos que pensabas tardar
};

export type PorHacer = {
  lista: TareaPanel[];
  mas: number; // las que no caben en el panel
  sinDia: number; // las que no tienen día (están en Tareas)
};

export type EstadoPanel = {
  // Tus tareas pendientes: lo atrasado, lo de hoy y lo de esta semana.
  porHacer: PorHacer | null;
  progreso: EstadoProgreso | null;
  // Las últimas notas y, aparte, las fijadas (para el botón de la chincheta).
  notas: { ultimas: NotaPanel[]; fijadas: NotaPanel[] } | null;
  // null si tienes Documentos apagado (ver Ajustes → Secciones de la app).
  documentos: EstadoDocumentos | null;
  // Si ves la sección de Empleo (para el atajo).
  empleo: boolean;
  // Tu frase motivadora del perfil (vacía si no has puesto ninguna).
  frase: string | null;
};

const NOTAS_EN_PANEL = 5;
const TAREAS_EN_PANEL = 8;
const DOCUMENTOS_EN_PANEL = 6;

export async function cargarEstado(): Promise<EstadoPanel | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const secciones = await leerSecciones();
  const [porHacer, progreso, notas, documentos, perfil] = await Promise.all([
    tareasDelPanel().catch((error) => {
      console.error(error);
      return null;
    }),
    progresoDeLaSemana().catch((error) => {
      console.error(error);
      return null;
    }),
    notasDelPanel().catch((error) => {
      console.error(error);
      return null;
    }),
    secciones.documentos ? documentosDelPanel() : null,
    leerPerfil(),
  ]);
  return {
    porHacer,
    progreso,
    notas,
    documentos,
    empleo: secciones.empleo,
    frase: perfil.motto,
  };
}

// Hoy y la media de los últimos 7 días (hoy incluido).
async function progresoDeLaSemana(): Promise<EstadoProgreso> {
  const ajustes = await leerAjustes();
  const hoy = await diaDeHoy();
  const { dias, resumen } = await cargarProgreso(
    sumarDias(hoy, -6),
    hoy,
    ajustes,
  );
  const deHoy = dias.find((d) => d.esHoy);
  return {
    hoy: {
      usado: deHoy?.usado ?? 0,
      sinApuntar: deHoy?.sinApuntar ?? null,
      enPie: deHoy?.enPie ?? null,
    },
    sueno: resumen.sueno,
    usado: resumen.usado,
    sinApuntar: resumen.sinApuntar,
  };
}

async function tareasDelPanel(): Promise<PorHacer> {
  const [tareas, hoy] = await Promise.all([listarTareas(false), diaDeHoy()]);
  const { lista, mas, sinDia } = tareasPorHacer(tareas, hoy, TAREAS_EN_PANEL);
  return {
    lista: lista.map((t) => ({
      id: t.id,
      titulo: t.title,
      cuando: cuandoTocaTarea(t, hoy),
      hora: t.due_time,
      atrasada: Boolean(t.due_date && t.due_date < hoy),
      previstos: t.estimated_minutes,
    })),
    mas,
    sinDia,
  };
}

async function notasDelPanel() {
  const notas = await listarNotas("activas", {
    busqueda: "",
    etiqueta: null,
    tipo: null,
  });
  const corta = (n: (typeof notas)[number]): NotaPanel => ({
    id: n.id,
    texto: resumenNota(n.body),
    fijada: n.pinned,
  });
  return {
    ultimas: notas.slice(0, NOTAS_EN_PANEL).map(corta),
    fijadas: notasFijadas(notas, NOTAS_EN_PANEL).map(corta),
  };
}

async function documentosDelPanel(): Promise<EstadoDocumentos> {
  const pase = await paseDrive();
  if (!pase.ok) {
    if (pase.motivo === "no-disponible") return { estado: "no-disponible" };
    if (pase.motivo === "fallo") return { estado: "fallo" };
    return { estado: "sin-drive" };
  }
  try {
    const todos = (await listarImportantes(pase.token))
      .map(leerDocumentoDrive)
      .filter((d) => d !== null);
    return {
      estado: "ok",
      lista: ordenarCartera(todos).slice(0, DOCUMENTOS_EN_PANEL),
      total: todos.length,
    };
  } catch (error) {
    console.error(error);
    return { estado: "fallo" };
  }
}
