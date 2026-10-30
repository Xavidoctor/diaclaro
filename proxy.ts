import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Todas las rutas menos los archivos estáticos, los iconos y el manifiesto.
  matcher: [
    "/((?!_next/static|_next/image|icons/|manifest.webmanifest|sw.js|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
