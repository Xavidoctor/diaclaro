"use server";

import { crearTareaParaDia, editarTarea } from "@/app/bandeja/actions";
import { aplicarCambio, leerVersionTarea } from "@/lib/data/cambios-sin-conexion";
import {
  cambiadoDespues,
  esquemaCambio,
  type Cambio,
  type Resultado,
} from "@/lib/planner/cambios-sin-conexion";
import { createClient } from "@/lib/supabase/server";

function comoFormulario(campos: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) formData.set(clave, valor);
  return formData;
}

// Editar o añadir tareas usa las mismas acciones que con internet, así
// cualquier campo nuevo del formulario funciona también sin conexión.
async function aplicarTarea(
  cambio: Extract<Cambio, { tipo: "editar-tarea" | "nueva-tarea" }>,
  forzar: boolean,
): Promise<Resultado> {
  if (cambio.tipo === "nueva-tarea") {
    await crearTareaParaDia({ envios: 0 }, comoFormulario(cambio.campos));
    return { estado: "ok" };
  }
  const version = await leerVersionTarea(cambio.tareaId);
  if (version === "error") return { estado: "error" };
  if (!version) return { estado: "no-existe" };
  if (!forzar && cambiadoDespues(version.updated_at, cambio.vista))
    return { estado: "cambiado", ahora: version.title };
  await editarTarea({}, comoFormulario({ ...cambio.campos, id: cambio.tareaId }));
  return { estado: "ok" };
}

// Envía un cambio que hiciste sin internet. «forzar» = has elegido
// «Guardar el mío» en «Revisa este cambio».
export async function enviarCambio(
  cambio: unknown,
  forzar = false,
): Promise<Resultado> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { estado: "error" };
  const r = esquemaCambio.safeParse(cambio);
  // Si está roto no hay forma de arreglarlo: se da por enviado y se quita.
  if (!r.success) return { estado: "ok" };
  try {
    if (r.data.tipo === "editar-tarea" || r.data.tipo === "nueva-tarea")
      return await aplicarTarea(r.data, forzar);
    return await aplicarCambio(r.data, forzar);
  } catch {
    return { estado: "error" };
  }
}
