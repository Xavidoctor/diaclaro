import { z } from "zod";
import { horaOpcional } from "./agenda";
import type { Resultado } from "./bandeja";
import { ZONA_HORARIA } from "./fechas";

// Reglas de los Ajustes. Todo es opcional menos la zona horaria:
// si no pones una hora, se queda vacía y la app no se la inventa.

export type Ajustes = {
  timezone: string;
  wake_time: string | null;
  sleep_time: string | null;
  lunch_time: string | null;
  dinner_time: string | null;
};

// Lo que se usa cuando aún no has guardado nada.
export const AJUSTES_INICIALES: Ajustes = {
  timezone: ZONA_HORARIA,
  wake_time: null,
  sleep_time: null,
  lunch_time: null,
  dinner_time: null,
};

// Zonas que se ofrecen en el desplegable. Se puede añadir cualquier otra.
export const ZONAS_HORARIAS = [
  { valor: "Europe/Madrid", nombre: "España (península y Baleares)" },
  { valor: "Atlantic/Canary", nombre: "Canarias" },
  { valor: "Europe/London", nombre: "Reino Unido y Portugal" },
  { valor: "America/Mexico_City", nombre: "México (centro)" },
  { valor: "America/Bogota", nombre: "Colombia" },
  { valor: "America/Argentina/Buenos_Aires", nombre: "Argentina" },
] as const;

// ¿El navegador y el servidor conocen esta zona horaria?
export function esZonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

const esquemaAjustes = z.object({
  timezone: z
    .string()
    .trim()
    .refine(esZonaValida, { error: "Esa zona horaria no existe." }),
  wake_time: horaOpcional,
  sleep_time: horaOpcional,
  lunch_time: horaOpcional,
  dinner_time: horaOpcional,
});

export function prepararAjustes(datos: {
  timezone: unknown;
  wake_time: unknown;
  sleep_time: unknown;
  lunch_time: unknown;
  dinner_time: unknown;
}): Resultado<Ajustes> {
  const r = esquemaAjustes.safeParse({
    timezone: datos.timezone ?? ZONA_HORARIA,
    wake_time: datos.wake_time ?? "",
    sleep_time: datos.sleep_time ?? "",
    lunch_time: datos.lunch_time ?? "",
    dinner_time: datos.dinner_time ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}
