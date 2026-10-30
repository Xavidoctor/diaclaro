"use server";

import { paseDrive } from "@/app/documentos/pase-drive";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarNotas } from "@/lib/data/bandeja";
import { cargarProgreso } from "@/lib/data/progreso";
import { listarImportantes } from "@/lib/google/api";
import { leerDocumentoDrive } from "@/lib/planner/documentos-importantes";
import type { DocumentoImportante } from "@/lib/planner/documentos-importantes";
import { hoyEn, sumarDias } from "@/lib/planner/fechas";
import {
  notasFijadas,
  ordenarCartera,
  resumenNota,
} from "@/lib/planner/panel-estado";
import type { Media } from "@/lib/planner/progreso";
import { createClient } from "@/lib/supabase/server";

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

export type EstadoPanel = {
  progreso: EstadoProgreso | null;
  // Las últimas notas y, aparte, las fijadas (para el botón de la chincheta).
  notas: { ultimas: NotaPanel[]; fijadas: NotaPanel[] } | null;
  documentos: EstadoDocumentos;
};

const NOTAS_EN_PANEL = 5;
const DOCUMENTOS_EN_PANEL = 6;

export async function cargarEstado(): Promise<EstadoPanel | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const [progreso, notas, documentos] = await Promise.all([
    progresoDeLaSemana().catch((error) => {
      console.error(error);
      return null;
    }),
    notasDelPanel().catch((error) => {
      console.error(error);
      return null;
    }),
    documentosDelPanel(),
  ]);
  return { progreso, notas, documentos };
}

// Hoy y la media de los últimos 7 días (hoy incluido).
async function progresoDeLaSemana(): Promise<EstadoProgreso> {
  const ajustes = await leerAjustes();
  const hoy = hoyEn(ajustes.timezone);
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
