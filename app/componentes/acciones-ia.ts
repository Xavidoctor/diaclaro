"use server";

import { redirect } from "next/navigation";
import { cargarSituacion } from "@/app/componentes/situacion-hoy";
import { mensajesExplicarCarga } from "@/lib/ai/explicar-carga";
import { iaDisponible, pedirTexto } from "@/lib/ai/groq";
import { apuntarUsoIA, MAX_USOS_IA_DIA } from "@/lib/data/uso-ia";
import { createClient } from "@/lib/supabase/server";

// Acción del botón "Explícamelo": pide a la IA que te cuente el día con
// palabras. La IA solo escribe texto; los números y los recortes los calcula
// la app, y nada se guarda hasta que tú pulsas "Aceptar".

export type ExplicacionState = { texto?: string; error?: string };

export async function explicarConIA(): Promise<ExplicacionState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (!iaDisponible()) return { error: "La IA no está configurada." };

  const { carga, propuesta, tareasHoy, ajustes, hoy } = await cargarSituacion();
  if (carga.estado === "falta-hora-acostarse")
    return { error: "Primero pon en Ajustes a qué hora sueles acostarte." };

  if (!(await apuntarUsoIA(hoy)))
    return {
      error: `Hoy ya has usado la IA ${MAX_USOS_IA_DIA} veces. Mañana vuelve a estar disponible.`,
    };

  const texto = await pedirTexto(
    mensajesExplicarCarga({
      apuntado: carga.apuntado,
      libre: carga.libre,
      diferencia: carga.diferencia,
      horaAcostarse: ajustes.sleep_time!,
      sinDuracion: carga.sinDuracion.length,
      tareas: tareasHoy.map((t) => ({
        title: t.title,
        minutos: t.estimated_minutes,
        importancia: t.importance,
      })),
      propuesta,
    }),
  );
  if (!texto)
    return {
      error:
        "La IA no responde ahora mismo. Lo de arriba sigue siendo válido: lo calcula la app.",
    };
  return { texto };
}
