"use server";

import { redirect } from "next/navigation";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import { mensajesResumirNotas } from "@/lib/ai/resumir-notas";
import { leerProyecto } from "@/lib/data/areas";
import { listarNotasDeProyecto } from "@/lib/data/bandeja";
import { apuntarUsoIA, topeIA } from "@/lib/data/uso-ia";
import { createClient } from "@/lib/supabase/server";
import { diaDeHoy } from "@/lib/data/dia-activo";

// «Resumir con IA» en la página de un proyecto. Las notas se leen aquí, en el
// servidor (no las manda el navegador), y solo las de ese proyecto.

export type ResumenState = { texto?: string; aviso?: string; error?: string };

export async function resumirNotas(
  _prev: ResumenState,
  formData: FormData,
): Promise<ResumenState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (!iaDisponible()) return { error: "La IA no está configurada." };

  const id = formData.get("proyecto");
  if (typeof id !== "string" || !id) return { error: "Falta el proyecto." };
  const [proyecto, notas] = await Promise.all([
    leerProyecto(id),
    listarNotasDeProyecto(id),
  ]);
  if (!proyecto) return { error: "No encuentro este proyecto." };
  if (notas.length === 0)
    return { error: "Este proyecto aún no tiene notas que resumir." };

  const hoy = await diaDeHoy();
  if (!(await apuntarUsoIA(hoy)))
    return {
      error: `Hoy ya has usado la IA ${await topeIA()} veces. Mañana vuelve a estar disponible.`,
    };

  const { mensajes, incluidas } = mensajesResumirNotas({
    proyecto: proyecto.name,
    notas: notas.map((n) => n.body),
  });
  const texto = await pedirTexto(mensajes);
  if (!texto)
    return { error: "La IA no responde ahora mismo. Prueba en un rato." };
  return {
    texto,
    aviso:
      incluidas < notas.length
        ? `He resumido las ${incluidas} notas más nuevas (de ${notas.length}).`
        : undefined,
  };
}
