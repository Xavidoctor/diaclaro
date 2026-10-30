import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Suscripcion } from "@/lib/planner/avisos";

// Única parte de los avisos que habla con Supabase.
// Las reglas RLS hacen que cada persona solo vea sus direcciones de avisos.

function comprobar(error: { message: string } | null, que: string) {
  if (error) throw new Error(`No se ha podido ${que}: ${error.message}`);
}

export async function listarSuscripciones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .limit(20);
  comprobar(error, "cargar los avisos");
  return (data ?? []) as Suscripcion[];
}

// Guarda la dirección de este dispositivo. Si ya estaba, se guarda de nuevo
// (así, si otra persona usó este móvil antes, ahora es tuya).
export async function guardarSuscripcion(sub: Suscripcion) {
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert(sub);
  comprobar(error, "activar los avisos");
}

export async function borrarSuscripcion(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  comprobar(error, "desactivar los avisos");
}
