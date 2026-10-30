import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  DatosApunte,
  DatosHabito,
  Habito,
  RegistroHabito,
} from "@/lib/planner/habitos";

// Única parte de los Hábitos que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.
// Importante: nada de aquí se pasa nunca a lib/ai (la IA no ve tus hábitos).

const CAMPOS_HABITO =
  "id, title, notes, direction, unit, daily_target, repeat_rule, active";

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

// Lo apuntado entre dos días (ambos incluidos).
export async function listarRegistrosEntre(desde: string, hasta: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, on_date, amount")
    .gte("on_date", desde)
    .lte("on_date", hasta)
    .limit(5000);
  comprobar(error, "cargar lo apuntado");
  return (data ?? []) as RegistroHabito[];
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
