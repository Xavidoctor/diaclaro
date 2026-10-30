import "server-only";
import { PERFIL_VACIO, type Perfil } from "@/lib/planner/perfil";
import { createClient } from "@/lib/supabase/server";

// Única parte del Perfil que habla con Supabase.
// Las reglas RLS ya hacen que cada persona solo vea lo suyo.

// Si aún no has guardado tu perfil (o falta la migración), da el perfil vacío:
// así Hoy y el panel se ven igual, solo que sin tu nombre.
export async function leerPerfil(): Promise<Perfil> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, age, about, motto")
    .maybeSingle();
  if (error) {
    console.error(`No se ha podido leer el perfil: ${error.message}`);
    return PERFIL_VACIO;
  }
  return (data as Perfil | null) ?? PERFIL_VACIO;
}

export async function guardarPerfil(perfil: Perfil) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No hay sesión.");
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, ...perfil, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error)
    throw new Error(`No se ha podido guardar el perfil: ${error.message}`);
}
