import "server-only";
import { horaCorta } from "@/lib/planner/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import type {
  HoraDormir,
  MotivoTarde,
  NocheParaCorregir,
} from "@/lib/planner/dormir";
import {
  calcularSuenoPerdido,
  type NocheDormida,
  type SuenoPerdido,
} from "@/lib/planner/sueno-perdido";
import { createClient } from "@/lib/supabase/server";

// Única parte de "Me voy a dormir" que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

// Las horas de acostarte entre dos noches (las dos incluidas).
export async function listarHorasDormir(
  desde: string,
  hasta: string,
): Promise<HoraDormir[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bedtimes")
    .select("on_date, bed_time")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(400);
  comprobar(error, "cargar tus horas de dormir");
  // La base de datos devuelve "23:40:00": nos quedamos con "23:40".
  return ((data ?? []) as HoraDormir[]).map((h) => ({
    on_date: h.on_date,
    bed_time: horaCorta(h.bed_time) ?? h.bed_time,
  }));
}

// Guarda (o cambia) la hora de acostarte de una noche.
// "motivo": por qué te acostaste más tarde. Si no se manda, se queda el que hubiera.
export async function guardarHoraDormir(
  hora: HoraDormir,
  motivo?: { late_reason: MotivoTarde | null; late_note: string | null },
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("bedtimes")
    .upsert(
      { user_id: userId, ...hora, ...motivo },
      { onConflict: "user_id,on_date" },
    );
  comprobar(error, "guardar tu hora de dormir");
}

export async function borrarHoraDormir(noche: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bedtimes")
    .delete()
    .eq("on_date", noche);
  comprobar(error, "borrar tu hora de dormir");
}

// El sueño perdido entre dos noches (las dos incluidas): la hora real de cada
// noche, la que tenías prevista (la de ese día o, si no, la de Ajustes) y el
// motivo que apuntaste.
export async function cargarSuenoPerdido(
  desde: string,
  hasta: string,
): Promise<SuenoPerdido> {
  const supabase = await createClient();
  const [ajustes, dormir, inicios] = await Promise.all([
    leerAjustes(),
    supabase
      .from("bedtimes")
      .select("on_date, bed_time, late_reason, late_note")
      .gte("on_date", desde)
      .lte("on_date", hasta)
      .limit(50),
    supabase
      .from("day_starts")
      .select("on_date, sleep_time")
      .gte("on_date", desde)
      .lte("on_date", hasta)
      .limit(50),
  ]);
  comprobar(dormir.error, "cargar tus horas de dormir");
  comprobar(inicios.error, "cargar tus horas previstas");
  const previstaDe = new Map(
    ((inicios.data ?? []) as { on_date: string; sleep_time: string | null }[])
      .filter((i) => i.sleep_time)
      .map((i) => [i.on_date, horaCorta(i.sleep_time)]),
  );
  const noches = (
    (dormir.data ?? []) as {
      on_date: string;
      bed_time: string;
      late_reason: MotivoTarde | null;
      late_note: string | null;
    }[]
  ).map(
    (d): NocheDormida => ({
      ...d,
      bed_time: horaCorta(d.bed_time) ?? d.bed_time,
      prevista: previstaDe.get(d.on_date) ?? ajustes.sleep_time,
    }),
  );
  return calcularSuenoPerdido(noches);
}

// La noche anterior al día que empiezas, para el enlace «Anoche… · cambiar»:
// la hora guardada (si la hay), la que tenías prevista y el motivo apuntado.
export async function leerNocheParaCorregir(
  noche: string,
  previstaDeAjustes: string | null,
): Promise<NocheParaCorregir> {
  const supabase = await createClient();
  const [dormir, inicio] = await Promise.all([
    supabase
      .from("bedtimes")
      .select("bed_time, late_reason, late_note")
      .eq("on_date", noche)
      .maybeSingle(),
    supabase
      .from("day_starts")
      .select("sleep_time")
      .eq("on_date", noche)
      .maybeSingle(),
  ]);
  const prevista =
    horaCorta((inicio.data?.sleep_time as string | null) ?? null) ??
    previstaDeAjustes;
  // Si falla (por ejemplo, aún no está la migración del motivo), al menos la hora.
  if (dormir.error) {
    const horas = await listarHorasDormir(noche, noche).catch(() => []);
    return {
      hora: horas[0]?.bed_time ?? null,
      prevista,
      late_reason: null,
      late_note: null,
    };
  }
  const d = dormir.data as {
    bed_time: string;
    late_reason: MotivoTarde | null;
    late_note: string | null;
  } | null;
  return {
    hora: horaCorta(d?.bed_time ?? null),
    prevista,
    late_reason: d?.late_reason ?? null,
    late_note: d?.late_note ?? null,
  };
}
