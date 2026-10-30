import { enviarAviso } from "@/lib/avisos/web-push";
import {
  cabeceraValida,
  contenidoAviso,
  leerPeticionAviso,
} from "@/lib/planner/avisos";

// Supabase llama aquí (cada 5 minutos, desde la migración 20261030300000)
// por cada aviso que toca enviar. Solo vale con la contraseña AVISOS_SECRETO.
// Esta ruta no lee la base de datos: solo envía el aviso que le dicen.
export async function POST(request: Request) {
  if (
    !cabeceraValida(
      request.headers.get("authorization"),
      process.env.AVISOS_SECRETO,
    )
  )
    return new Response("No autorizado", { status: 401 });

  const datos = await request.json().catch(() => null);
  const r = leerPeticionAviso(datos);
  if (!r.ok) return new Response(r.error, { status: 400 });

  try {
    const codigo = await enviarAviso(r.valor, contenidoAviso(r.valor));
    // Se devuelve el mismo código: con 404 o 410, Supabase borra esa dirección.
    return new Response(null, {
      status: codigo >= 200 && codigo < 300 ? 204 : codigo,
    });
  } catch {
    return new Response("No se ha podido enviar", { status: 500 });
  }
}
