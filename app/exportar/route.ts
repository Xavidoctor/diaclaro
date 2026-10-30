import { NextResponse, type NextRequest } from "next/server";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerTodo } from "@/lib/data/exportar";
import { armarCopia, nombreArchivo } from "@/lib/planner/exportar";
import { hoyEn } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

// /exportar descarga un archivo JSON con todos tus datos (la copia de seguridad).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const [{ filas, avisos }, { timezone }] = await Promise.all([
    leerTodo(),
    leerAjustes(),
  ]);
  const copia = armarCopia(filas, avisos, new Date());

  return new NextResponse(JSON.stringify(copia, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo(hoyEn(timezone))}"`,
      // Son datos privados: que no se guarden en ninguna caché.
      "Cache-Control": "private, no-store",
    },
  });
}
