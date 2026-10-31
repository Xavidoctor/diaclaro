"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { guardarUsarRitmo } from "@/lib/data/ritmo";
import { createClient } from "@/lib/supabase/server";

// «¿Lo uso?»: enciende o apaga el uso de lo que sueles tardar de verdad.
export async function cambiarUsarRitmo(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  try {
    await guardarUsarRitmo(formData.get("usar") === "si");
  } catch {
    redirect("/conocerte?error=ritmo");
  }
  refresh();
}
