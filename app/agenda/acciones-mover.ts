"use server";

import { refresh } from "next/cache";
import { cambiarTarea, leerTarea } from "@/lib/data/bandeja";
import {
  cambiarRutinaFija,
  guardarMovida,
  quitarMovida,
} from "@/lib/data/mover-dia";
import { leerRutina } from "@/lib/data/rutinas";
import { leerMovimiento, usaHoraPorVez } from "@/lib/planner/mover-dia";
import { createClient } from "@/lib/supabase/server";

// Acciones de «ordenar el día»: se ejecutan en el servidor al soltar el
// dedo en la Agenda (o al cambiar la hora fija de una rutina).

async function haySesion(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

export type ResultadoMover = { ok: true } | { ok: false; error: string };

// Cambia la hora de una tarea, o la de una rutina SOLO ese día.
export async function moverEnElDia(datos: unknown): Promise<ResultadoMover> {
  if (!(await haySesion()))
    return { ok: false, error: "Vuelve a entrar en la app." };
  const m = leerMovimiento(datos);
  if (!m) return { ok: false, error: "No he entendido la hora nueva." };
  try {
    if (m.tipo === "tarea") {
      const tarea = await leerTarea(m.id);
      if (!tarea || tarea.due_date !== m.fecha)
        return { ok: false, error: "Esa tarea ya no está en este día." };
      await cambiarTarea(m.id, { due_time: m.hora });
    } else {
      const rutina = await leerRutina(m.id);
      if (!rutina) return { ok: false, error: "Esa rutina ya no existe." };
      // Si la devuelves a su hora de siempre, se borra el cambio de ese día.
      const deSiempre = usaHoraPorVez(rutina)
        ? rutina.times_of_day![m.vez - 1]
        : m.vez === 1
          ? rutina.window_start
          : null;
      if (!deSiempre)
        return { ok: false, error: "Esa vez de la rutina no tiene hora." };
      if (deSiempre === m.hora) await quitarMovida(m.id, m.fecha, m.vez);
      else
        await guardarMovida({
          routine_id: m.id,
          on_date: m.fecha,
          slot: m.vez,
          start_time: m.hora,
        });
    }
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error:
        "No he podido guardar la hora nueva. Si acabas de actualizar la app, puede que falte aplicar su cambio en la base de datos.",
    };
  }
  refresh();
  return { ok: true };
}

// «Hora fija» de una rutina: con candado no se mueve en la Agenda.
export async function fijarRutina(formData: FormData) {
  if (!(await haySesion())) return;
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") return;
  await cambiarRutinaFija(id, formData.get("fija") === "si");
  refresh();
}
