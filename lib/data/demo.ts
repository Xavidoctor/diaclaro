import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leerNumeroDemo, type NumeroDemo } from "@/lib/planner/demo";

// Única parte de las cuentas demo que habla con Supabase.

// Si has entrado con una cuenta demo, su número (1, 2 o 3). Si no, null.
// La regla RLS solo deja ver tu propia fila, así que una cuenta real no ve nada.
export async function leerCuentaDemo(): Promise<NumeroDemo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demo_accounts")
    .select("numero")
    .maybeSingle();
  // Si la migración aún no está, la tabla no existe: no es demo.
  if (error || !data) return null;
  return leerNumeroDemo(String(data.numero));
}

export async function esCuentaDemo(): Promise<boolean> {
  return (await leerCuentaDemo()) !== null;
}

// Borra todo lo de tu cuenta demo y vuelve a cargar los ejemplos.
// La base de datos comprueba otra vez que la cuenta es demo.
export async function restablecerDemo() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("restablecer_demo");
  if (error)
    throw new Error(`No se ha podido restablecer: ${error.message}`);
}
