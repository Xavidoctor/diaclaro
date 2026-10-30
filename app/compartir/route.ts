import { NextResponse, type NextRequest } from "next/server";
import { paseDrive } from "@/app/documentos/pase-drive";
import { carpetaImportantes, subirAImportantes } from "@/lib/google/api";
import {
  MAX_COMPARTIR_DE_GOLPE,
  MAX_MB_COMPARTIR,
  comprobarArchivo,
  cuerpoSubida,
  metadatosSubida,
  nombreParaGuardar,
} from "@/lib/planner/documentos-importantes";
import { createClient } from "@/lib/supabase/server";

// «Compartir → DíaClaro» en el móvil. Haces una captura o eliges una foto
// en la galería, pulsas Compartir, eliges DíaClaro y llega aquí. Se guarda
// en tu carpeta de documentos importantes de Drive, con el tipo «Otros»,
// y te lleva a la pantalla para cambiarlo si quieres.
// (Lo activa "share_target" en app/manifest.ts.)

function volver(request: NextRequest, consulta: string) {
  // 303: después de un envío, el navegador abre la página con GET.
  return NextResponse.redirect(
    new URL(`/documentos?${consulta}`, request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims)
    return NextResponse.redirect(new URL("/login", request.url), 303);

  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return volver(
      request,
      `fallo=${encodeURIComponent("No me ha llegado ningún archivo.")}`,
    );
  }
  const archivos = datos
    .getAll("archivos")
    .filter((a): a is File => a instanceof File && a.size > 0)
    .slice(0, MAX_COMPARTIR_DE_GOLPE);
  if (archivos.length === 0)
    return volver(
      request,
      `fallo=${encodeURIComponent("No me ha llegado ningún archivo. Comparte una foto o un PDF.")}`,
    );

  const pase = await paseDrive();
  if (!pase.ok)
    // Sin Drive conectado: la pantalla enseña el botón para conectarlo.
    return volver(request, "");

  let carpeta: string | null = null;
  try {
    carpeta = await carpetaImportantes(pase.token, true);
  } catch (error) {
    console.error(error);
  }
  if (!carpeta)
    return volver(
      request,
      `fallo=${encodeURIComponent("No he podido abrir tu Drive. Prueba otra vez.")}`,
    );

  let guardados = 0;
  let problema = "";
  for (const archivo of archivos) {
    const revision = comprobarArchivo(archivo, MAX_MB_COMPARTIR);
    if (!revision.ok) {
      problema = `${revision.mensaje} Para archivos grandes, súbelo desde esta pantalla.`;
      continue;
    }
    const ok = await subirAImportantes(
      pase.token,
      cuerpoSubida(
        metadatosSubida({
          nombre: nombreParaGuardar("", archivo.name),
          tipo: "otros",
          carpeta,
        }),
        archivo,
        archivo.type,
      ),
    );
    if (ok) guardados++;
    else problema = "Alguno no se ha podido guardar. Prueba otra vez.";
  }
  if (problema)
    return volver(
      request,
      `fallo=${encodeURIComponent(guardados > 0 ? `Guardados ${guardados}. ${problema}` : problema)}`,
    );
  return volver(request, `compartido=${guardados}`);
}

// Si alguien abre /compartir a mano, lo llevamos a la pantalla.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/documentos", request.url));
}
