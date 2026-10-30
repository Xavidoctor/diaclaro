// Vercel publica la app en varias direcciones (diaclaro.vercel.app y alias como
// diaclaro-diaclaeo.vercel.app). El login con enlace solo funciona bien en una:
// la que está en Supabase. Esta función dice si hay que mandar al usuario a la
// dirección principal. Es pura para poder probarla.
export function dominioAlQueRedirigir(datos: {
  host: string | null;
  entorno: string | undefined;
  principal: string | undefined;
}): string | null {
  // Solo en producción: las vistas previas y tu ordenador se quedan como están.
  if (datos.entorno !== "production" || !datos.principal || !datos.host) {
    return null;
  }
  return datos.host === datos.principal ? null : datos.principal;
}
