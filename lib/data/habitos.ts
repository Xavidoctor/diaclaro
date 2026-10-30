import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  apuntesDeRutinas,
  type DatosApunte,
  type DatosHabito,
  type Habito,
  type RegistroHabito,
} from "@/lib/planner/habitos";
import type { RegistroRutina } from "@/lib/planner/rutinas";

// Única parte de los Hábitos que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.
// Importante: nada de aquí se pasa nunca a lib/ai (la IA no ve tus hábitos).

const CAMPOS_HABITO =
  "id, title, notes, direction, unit, daily_target, repeat_rule, routine_id, remind_at, active";

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function listarHabitos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .select(CAMPOS_HABITO)
    .order("created_at")
    .limit(100);
  comprobar(error, "cargar los hábitos");
  return (data ?? []) as Habito[];
}

export async function leerHabito(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .select(CAMPOS_HABITO)
    .eq("id", id)
    .maybeSingle();
  comprobar(error, "leer el hábito");
  return data as Habito | null;
}

export async function crearHabito(datos: DatosHabito) {
  const supabase = await createClient();
  const { error } = await supabase.from("habits").insert(datos);
  comprobar(error, "guardar el hábito");
}

export async function cambiarHabito(
  id: string,
  cambios: Partial<DatosHabito & { active: boolean }>,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("habits").update(cambios).eq("id", id);
  comprobar(error, "cambiar el hábito");
}

// Borra el hábito y todo su registro (la base de datos lo hace sola).
export async function borrarHabito(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  comprobar(error, "borrar el hábito");
}

// Lo apuntado entre dos días (ambos incluidos), sumando los «Hecho»
// de las rutinas unidas a algún hábito (cada uno cuenta como 1).
export async function listarRegistrosEntre(desde: string, hasta: string) {
  const supabase = await createClient();
  const [propios, unidos] = await Promise.all([
    supabase
      .from("habit_logs")
      .select("habit_id, on_date, amount")
      .gte("on_date", desde)
      .lte("on_date", hasta)
      .limit(5000),
    supabase
      .from("habits")
      .select("id, routine_id")
      .not("routine_id", "is", null)
      .limit(100),
  ]);
  comprobar(propios.error, "cargar lo apuntado");
  comprobar(unidos.error, "cargar los hábitos unidos a rutinas");
  const registros = (propios.data ?? []) as RegistroHabito[];
  const habitos = (unidos.data ?? []) as Pick<Habito, "id" | "routine_id">[];
  if (habitos.length === 0) return registros;

  const rutinas = [...new Set(habitos.map((h) => h.routine_id as string))];
  const { data, error } = await supabase
    .from("routine_logs")
    .select("routine_id, on_date")
    .in("routine_id", rutinas)
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(5000);
  comprobar(error, "cargar las rutinas hechas");
  return [
    ...registros,
    ...apuntesDeRutinas(habitos, (data ?? []) as RegistroRutina[]),
  ];
}

export async function apuntarHabito(
  habitoId: string,
  fecha: string,
  apunte: DatosApunte,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habit_logs")
    .insert({ habit_id: habitoId, on_date: fecha, ...apunte });
  comprobar(error, "apuntar");
}

// Deshace el último apunte de ese día (por si pulsas sin querer).
export async function quitarUltimoApunte(habitoId: string, fecha: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitoId)
    .eq("on_date", fecha)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  comprobar(error, "buscar el último apunte");
  if (!data) return;
  const { error: errorBorrar } = await supabase
    .from("habit_logs")
    .delete()
    .eq("id", data.id);
  comprobar(errorBorrar, "deshacer");
}

export type ApunteConNota = {
  id: string;
  on_date: string;
  amount: number;
  note: string | null;
};

// Los apuntes de un hábito desde un día, del más nuevo al más viejo.
export async function listarApuntesDeHabito(habitoId: string, desde: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("id, on_date, amount, note")
    .eq("habit_id", habitoId)
    .gte("on_date", desde)
    .order("on_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  comprobar(error, "cargar lo apuntado");
  return (data ?? []) as ApunteConNota[];
}

// Lo apuntado de un solo hábito entre dos días, con los «Hecho» de su rutina.
export async function listarRegistrosDeHabito(
  habito: Pick<Habito, "id" | "routine_id">,
  desde: string,
  hasta: string,
) {
  const supabase = await createClient();
  const [propios, hechos] = await Promise.all([
    supabase
      .from("habit_logs")
      .select("habit_id, on_date, amount")
      .eq("habit_id", habito.id)
      .gte("on_date", desde)
      .lte("on_date", hasta)
      .limit(5000),
    habito.routine_id
      ? supabase
          .from("routine_logs")
          .select("routine_id, on_date")
          .eq("routine_id", habito.routine_id)
          .gte("on_date", desde)
          .lte("on_date", hasta)
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  comprobar(propios.error, "cargar lo apuntado");
  comprobar(hechos.error, "cargar las rutinas hechas");
  return [
    ...((propios.data ?? []) as RegistroHabito[]),
    ...apuntesDeRutinas([habito], (hechos.data ?? []) as RegistroRutina[]),
  ];
}
