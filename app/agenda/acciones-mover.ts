"use server";

import { refresh } from "next/cache";
import { cambiarTarea, leerTarea } from "@/lib/data/bandeja";
import { guardarExcepcion, leerEvento } from "@/lib/data/agenda";
import {
  cambiarRutinaFija,
  cambiarRutinaGrabada,
  guardarMovida,
  quitarMovida,
} from "@/lib/data/mover-dia";
import { leerRutina } from "@/lib/data/rutinas";
import {
  leerMovimiento,
  leerTerminar,
  usaHoraPorVez,
} from "@/lib/planner/mover-dia";
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
      // Sin hora de siempre (por ejemplo, «Deporte, 60 min»): ese día va a
      // la hora que elijas.
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

// «Clase grabada»: si se junta con otra clase que no lo está, la app la
// deja para otro momento y la puedes mover.
export async function marcarGrabada(formData: FormData) {
  if (!(await haySesion())) return;
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") return;
  await cambiarRutinaGrabada(id, formData.get("grabada") === "si");
  refresh();
}

// «Ya ha terminado»: ese día, la clase o el compromiso acaba a esta hora.
// No cambia su horario de siempre. Con lo de Google no se puede (es solo lectura).
export async function terminarAntes(datos: unknown): Promise<ResultadoMover> {
  if (!(await haySesion()))
    return { ok: false, error: "Vuelve a entrar en la app." };
  const t = leerTerminar(datos);
  if (!t) return { ok: false, error: "No he entendido la hora." };
  try {
    if (t.tipo === "evento") {
      const evento = await leerEvento(t.id);
      if (!evento) return { ok: false, error: "Ese compromiso ya no existe." };
      await guardarExcepcion(t.id, t.fechaOriginal, {
        cancelled: false,
        new_date: t.fecha,
        new_start_time: t.inicio,
        new_end_time: t.fin,
      });
    } else {
      await guardarMovida({
        routine_id: t.id,
        on_date: t.fecha,
        slot: t.vez,
        start_time: t.inicio,
        end_time: t.fin,
      });
    }
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error:
        "No he podido guardarlo. Si acabas de actualizar la app, puede que falte aplicar su cambio en la base de datos.",
    };
  }
  refresh();
  return { ok: true };
}
