import "server-only";
import { TABLAS, type Tabla } from "@/lib/planner/exportar";
import { createClient } from "@/lib/supabase/server";

// Lee todas tus filas de todas las tablas para la copia de seguridad.
// Las reglas RLS hacen que solo salgan las tuyas, nunca las de otra persona.

// Supabase da como mucho 1000 filas por consulta: se piden por páginas.
const POR_PAGINA = 1000;

export async function leerTodo() {
  const supabase = await createClient();
  const filas: Partial<Record<Tabla, Record<string, unknown>[]>> = {};
  const avisos: string[] = [];

  for (const tabla of TABLAS) {
    const lista: Record<string, unknown>[] = [];
    let error: { code?: string; message: string } | null = null;
    for (let desde = 0; ; desde += POR_PAGINA) {
      const r = await supabase
        .from(tabla)
        .select("*")
        .order("created_at")
        .range(desde, desde + POR_PAGINA - 1);
      if (r.error) {
        error = r.error;
        break;
      }
      lista.push(...(r.data as Record<string, unknown>[]));
      if (r.data.length < POR_PAGINA) break;
    }

    if (!error) filas[tabla] = lista;
    // PGRST205 = la tabla no existe (aún no has aplicado su migración).
    else if (error.code === "PGRST205")
      avisos.push(`${tabla}: la tabla aún no existe en tu base de datos.`);
    else
      throw new Error(
        `No se ha podido copiar la tabla ${tabla}: ${error.message}`,
      );
  }
  return { filas, avisos };
}
