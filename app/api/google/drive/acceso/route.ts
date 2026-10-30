import { NextResponse } from "next/server";
import { leerConexionGoogle } from "@/lib/data/google";
import {
  pedirAccesoDrive,
  secretoGoogle,
  selectorDriveDisponible,
} from "@/lib/google/api";
import { descifrar } from "@/lib/google/cifrado";
import { createClient } from "@/lib/supabase/server";

// El navegador pide aquí un pase de una hora para abrir el selector de
// archivos de Google. El pase SOLO sirve para Drive con "drive.file":
// no deja leer tu calendario ni el resto de tu Drive.
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims)
    return NextResponse.json({ error: "sesion" }, { status: 401 });
  if (!selectorDriveDisponible())
    return NextResponse.json({ error: "no-disponible" }, { status: 503 });

  const conexion = await leerConexionGoogle().catch(() => null);
  if (!conexion?.drive)
    return NextResponse.json({ error: "sin-drive" }, { status: 403 });
  const permiso = descifrar(conexion.refresh_token_cifrado, secretoGoogle());
  if (!permiso)
    return NextResponse.json({ error: "permiso-retirado" }, { status: 403 });

  const acceso = await pedirAccesoDrive(permiso);
  if (!acceso.ok)
    return NextResponse.json({ error: acceso.motivo }, { status: 502 });
  return NextResponse.json(
    { token: acceso.token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
