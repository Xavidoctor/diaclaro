import "server-only";
import { leerDiaDeHoy } from "@/lib/data/dia-activo";
import { prepararCaptura } from "@/lib/planner/bandeja";
import {
  cambiadoDespues,
  diaDelApunte,
  type Cambio,
  type Resultado,
} from "@/lib/planner/cambios-sin-conexion";
import { esTipoNota, leerCampoEtiquetas } from "@/lib/planner/etiquetas";
import { prepararApunte } from "@/lib/planner/habitos";
import { createClient } from "@/lib/supabase/server";

// Aplica en Supabase un cambio hecho sin internet (las reglas están en
// lib/planner/cambios-sin-conexion.ts). Antes de guardar mira si esa cosa
// se cambió en otro aparato mientras tanto: entonces no la pisa y contesta
// «cambiado», salvo que tú hayas elegido «Guardar el mío» (forzar).
// Las reglas RLS hacen que solo se pueda tocar lo tuyo.
export async function aplicarCambio(
  cambio: Cambio,
  forzar: boolean,
): Promise<Resultado> {
  const supabase = await createClient();

  if (cambio.tipo === "tarea-hecha") {
    const { data, error } = await supabase
      .from("tasks")
      .select("title, done_at, deleted_at, updated_at")
      .eq("id", cambio.tareaId)
      .maybeSingle();
    if (error) return { estado: "error" };
    if (!data || data.deleted_at) return { estado: "no-existe" };
    if (data.done_at) return { estado: "ok" }; // ya estaba hecha
    if (!forzar && cambiadoDespues(data.updated_at, cambio.vista))
      return { estado: "cambiado", ahora: data.title };
    const { error: e } = await supabase
      .from("tasks")
      .update({
        done_at: cambio.creado, // la hora en que la marcaste, no la de ahora
        actual_minutes: cambio.minutos,
      })
      .eq("id", cambio.tareaId);
    return e ? { estado: "error" } : { estado: "ok" };
  }

  if (cambio.tipo === "editar-nota") {
    const r = prepararCaptura(cambio.texto);
    if (!r.ok) return { estado: "ok" }; // texto vacío: no se guarda, como siempre
    const { data, error } = await supabase
      .from("notes")
      .select("body, deleted_at, updated_at")
      .eq("id", cambio.notaId)
      .maybeSingle();
    if (error) return { estado: "error" };
    if (!data || data.deleted_at) return { estado: "no-existe" };
    if (!forzar && data.body !== r.valor.texto && cambiadoDespues(data.updated_at, cambio.vista))
      return { estado: "cambiado", ahora: data.body };
    const { error: e } = await supabase
      .from("notes")
      .update({
        body: r.valor.texto,
        url: r.valor.url,
        ...(cambio.etiquetas !== undefined
          ? { tags: leerCampoEtiquetas(cambio.etiquetas) }
          : {}),
        ...(esTipoNota(cambio.tipoNota) ? { kind: cambio.tipoNota } : {}),
      })
      .eq("id", cambio.notaId);
    return e ? { estado: "error" } : { estado: "ok" };
  }

  // Apuntar un hábito: se suma, así que no hay nada que se pueda pisar.
  const r = prepararApunte({ amount: cambio.cantidad, note: cambio.nota });
  if (!r.ok) return { estado: "ok" };
  const { data, error } = await supabase
    .from("habits")
    .select("id")
    .eq("id", cambio.habitoId)
    .maybeSingle();
  if (error) return { estado: "error" };
  if (!data) return { estado: "no-existe" };
  const hoy = await leerDiaDeHoy();
  const dia = diaDelApunte(cambio.dia, hoy) ?? hoy.dia;
  const { error: e } = await supabase
    .from("habit_logs")
    .insert({ habit_id: cambio.habitoId, on_date: dia, ...r.valor });
  return e ? { estado: "error" } : { estado: "ok" };
}
