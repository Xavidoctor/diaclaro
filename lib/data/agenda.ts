import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  horaCorta,
  type CambioDia,
  type DatosEvento,
  type Evento,
  type Excepcion,
} from "@/lib/planner/agenda";

// Única parte de la Agenda que habla con Supabase.
// Como en la Bandeja, las reglas RLS ya filtran: cada persona solo ve lo suyo.

const CAMPOS_EVENTO =
  "id, title, notes, start_date, start_time, end_time, part_of_day, repeat_rule";
const CAMPOS_EXCEPCION =
  "event_id, on_date, cancelled, new_date, new_start_time, new_end_time";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// Postgres devuelve las horas como "16:00:00": aquí se dejan en "16:00".
function limpiarEvento(e: Evento): Evento {
  return {
    ...e,
    start_time: horaCorta(e.start_time),
    end_time: horaCorta(e.end_time),
  };
}
function limpiarExcepcion(e: Excepcion): Excepcion {
  return {
    ...e,
    new_start_time: horaCorta(e.new_start_time),
    new_end_time: horaCorta(e.new_end_time),
  };
}

// Los eventos que pueden aparecer en el periodo: los que empiezan antes de que
// acabe. Si se repiten, rrule (en lib/planner) decide qué días tocan.
export async function listarEventosHasta(hasta: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(CAMPOS_EVENTO)
    .lte("start_date", hasta)
    .order("start_date")
    .limit(500);
  comprobar(error, "cargar la agenda");
  return ((data ?? []) as Evento[]).map(limpiarEvento);
}

// Excepciones de esos eventos. Se piden todas las de esos eventos (no solo las
// del periodo) porque un día movido puede venir de fuera del periodo.
export async function listarExcepciones(eventoIds: string[]) {
  if (eventoIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_exceptions")
    .select(CAMPOS_EXCEPCION)
    .in("event_id", eventoIds)
    .limit(2000);
  comprobar(error, "cargar los cambios de la agenda");
  return ((data ?? []) as Excepcion[]).map(limpiarExcepcion);
}

export async function leerEvento(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(CAMPOS_EVENTO)
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer el evento");
  return data ? limpiarEvento(data as Evento) : null;
}

export async function leerExcepcion(eventoId: string, dia: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_exceptions")
    .select(CAMPOS_EXCEPCION)
    .eq("event_id", eventoId)
    .eq("on_date", dia)
    .maybeSingle();
  comprobar(error, "leer el cambio de ese día");
  return data ? limpiarExcepcion(data as Excepcion) : null;
}

export async function crearEvento(datos: DatosEvento) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(datos);
  comprobar(error, "guardar el evento");
}

export async function cambiarEvento(id: string, datos: DatosEvento) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update(datos).eq("id", id);
  comprobar(error, "cambiar el evento");
}

// Borra el evento y, con él, sus excepciones (la base de datos lo hace sola).
export async function borrarEvento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  comprobar(error, "borrar el evento");
}

// Guarda el cambio de un día. Si ya había uno para ese día, lo sustituye.
export async function guardarExcepcion(
  eventoId: string,
  dia: string,
  cambio: { cancelled: true } | ({ cancelled: false } & CambioDia),
) {
  const supabase = await createClient();
  const fila = cambio.cancelled
    ? {
        cancelled: true,
        new_date: null,
        new_start_time: null,
        new_end_time: null,
      }
    : cambio;
  const { error } = await supabase
    .from("event_exceptions")
    .upsert(
      { event_id: eventoId, on_date: dia, ...fila },
      { onConflict: "event_id,on_date" },
    );
  comprobar(error, "guardar el cambio de ese día");
}

// Quita el cambio: ese día vuelve a ser como dice la regla.
export async function borrarExcepcion(eventoId: string, dia: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_exceptions")
    .delete()
    .eq("event_id", eventoId)
    .eq("on_date", dia);
  comprobar(error, "deshacer el cambio de ese día");
}
