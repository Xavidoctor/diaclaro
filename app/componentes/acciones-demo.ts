"use server";

import { redirect } from "next/navigation";
import { restablecerDemo } from "@/lib/data/demo";
import { createClient } from "@/lib/supabase/server";

// Botón «Restablecer» de las cuentas demo: lo deja todo como al principio.
// Si la cuenta no es demo, la base de datos lo rechaza y no se borra nada.
export async function restablecerCuentaDemo(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  try {
    await restablecerDemo();
  } catch {
    return "No se ha podido restablecer. Prueba otra vez en un momento.";
  }
  redirect("/");
}
