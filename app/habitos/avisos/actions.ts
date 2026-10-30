"use server";

import { redirect } from "next/navigation";
import { enviarAviso } from "@/lib/avisos/web-push";
import { esCuentaDemo } from "@/lib/data/demo";
import {
  borrarSuscripcion,
  guardarSuscripcion,
  listarSuscripciones,
} from "@/lib/data/avisos";
import { AVISO_DE_PRUEBA, leerSuscripcion } from "@/lib/planner/avisos";
import { createClient } from "@/lib/supabase/server";

// Acciones de los avisos. Cada una comprueba primero que hay sesión.

async function exigirSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
}

export type ResultadoAviso = { ok: true } | { ok: false; error: string };

// Guarda la dirección de avisos de este dispositivo.
export async function activarAvisos(datos: unknown): Promise<ResultadoAviso> {
  await exigirSesion();
  // Las cuentas demo las comparte más gente: los avisos le llegarían a otro.
  if (await esCuentaDemo())
    return {
      ok: false,
      error: "En las cuentas de prueba no se pueden activar los avisos.",
    };
  const r = leerSuscripcion(datos);
  if (!r.ok) return r;
  try {
    await guardarSuscripcion(r.valor);
  } catch {
    return {
      ok: false,
      error: "No se han podido activar. Revisa la conexión.",
    };
  }
  return { ok: true };
}

export async function desactivarAvisos(
  endpoint: string,
): Promise<ResultadoAviso> {
  await exigirSesion();
  try {
    await borrarSuscripcion(endpoint);
  } catch {
    return {
      ok: false,
      error: "No se han podido desactivar. Revisa la conexión.",
    };
  }
  return { ok: true };
}

// Manda un aviso de prueba a todos tus dispositivos con los avisos activados.
export async function probarAviso(): Promise<ResultadoAviso> {
  await exigirSesion();
  try {
    const subs = await listarSuscripciones();
    if (subs.length === 0)
      return {
        ok: false,
        error: "Primero activa los avisos en este dispositivo.",
      };
    const codigos = await Promise.all(
      subs.map((s) => enviarAviso(s, AVISO_DE_PRUEBA)),
    );
    // Quita las direcciones que ya no existen.
    await Promise.all(
      subs
        .filter((_, i) => codigos[i] === 404 || codigos[i] === 410)
        .map((s) => borrarSuscripcion(s.endpoint)),
    );
    if (!codigos.some((c) => c >= 200 && c < 300))
      return {
        ok: false,
        error: "No ha llegado. Prueba a desactivar y activar.",
      };
  } catch {
    return { ok: false, error: "No se ha podido enviar. Revisa las claves." };
  }
  return { ok: true };
}
