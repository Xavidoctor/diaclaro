import "server-only";
import { horaCorta } from "@/lib/planner/agenda";
import type { MovidaRutina } from "@/lib/planner/mover-dia";
import { createClient } from "@/lib/supabase/server";

// Única parte de «ordenar el día» que habla con Supabase: qué rutinas
// tienen hora fija y las horas que has movido solo un día.
// Las reglas RLS ya hacen que cada persona solo vea y cambie lo suyo.
// Necesita la migración 20261030510000_mover_en_el_dia.sql.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// ¿Falla porque aún no existe una columna de la migración 530000?
function faltaColumna(error: { code?: string; message: string } | null) {
  return Boolean(
    error && (error.code === "42703" || error.code === "PGRST204"),
  );
}

// Lo que has dicho de cada rutina: si tiene hora fija (null = la app
// decide, ver rutinaFija en mover-dia.ts) y si es una clase grabada.
export type OpcionesRutina = { fija: boolean | null; grabada: boolean };

export async function leerOpcionesRutinas(): Promise<
  Map<string, OpcionesRutina>
> {
  const supabase = await createClient();
  const pedir = (campos: string) =>
    supabase.from("routines").select(campos).limit(200);
  let { data, error } = await pedir("id, fixed_time, recorded");
  // Sin la migración 530000 aún no hay «grabada».
  if (faltaColumna(error)) ({ data, error } = await pedir("id, fixed_time"));
  comprobar(error, "leer las horas fijas");
  const filas = (data ?? []) as unknown as {
    id: string;
    fixed_time: boolean | null;
    recorded?: boolean;
  }[];
  return new Map(
    filas.map((r) => [
      r.id,
      { fija: r.fixed_time, grabada: Boolean(r.recorded) },
    ]),
  );
}

export async function cambiarRutinaGrabada(id: string, grabada: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ recorded: grabada })
    .eq("id", id);
  comprobar(error, "cambiar si la clase está grabada");
}

export async function cambiarRutinaFija(id: string, fija: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ fixed_time: fija })
    .eq("id", id);
  comprobar(error, "cambiar la hora fija");
}

// Las horas que has movido entre dos días (los dos incluidos).
export async function listarMovidas(
  desde: string,
  hasta: string,
): Promise<MovidaRutina[]> {
  const supabase = await createClient();
  const pedir = (campos: string) =>
    supabase
      .from("routine_moves")
      .select(campos)
      .gte("on_date", desde)
      .lte("on_date", hasta)
      .limit(500);
  let { data, error } = await pedir(
    "routine_id, on_date, slot, start_time, end_time",
  );
  if (faltaColumna(error))
    ({ data, error } = await pedir("routine_id, on_date, slot, start_time"));
  comprobar(error, "leer las horas movidas");
  return ((data ?? []) as unknown as MovidaRutina[]).map((m) => ({
    ...m,
    start_time: horaCorta(m.start_time)!,
    end_time: horaCorta(m.end_time ?? null),
  }));
}

// Mueve una vez de una rutina solo ese día (si ya la habías movido, la cambia).
export async function guardarMovida(m: MovidaRutina) {
  const supabase = await createClient();
  const guardar = (fila: MovidaRutina) =>
    supabase
      .from("routine_moves")
      .upsert(fila, { onConflict: "routine_id,on_date,slot" });
  // Al mover, la hora de fin vuelve a ser la de siempre.
  let { error } = await guardar({ ...m, end_time: m.end_time ?? null });
  if (faltaColumna(error) && !m.end_time) {
    const sinFin = { ...m };
    delete sinFin.end_time;
    ({ error } = await guardar(sinFin));
  }
  comprobar(error, "mover la rutina");
}

// Vuelve a su hora de siempre ese día.
export async function quitarMovida(
  rutinaId: string,
  fecha: string,
  vez: number,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_moves")
    .delete()
    .eq("routine_id", rutinaId)
    .eq("on_date", fecha)
    .eq("slot", vez);
  comprobar(error, "devolver la rutina a su hora");
}
