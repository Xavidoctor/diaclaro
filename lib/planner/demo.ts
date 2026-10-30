// Cuentas de demostración: 3 cuentas para probar la app sin email.
// Funciones puras (sin base de datos) para poder probarlas.

// Los emails de las 3 cuentas. Tienen que coincidir con los usuarios que
// se crean en Supabase y con la migración 20261030410000_cuentas_demo.sql.
// example.com es un dominio reservado: ningún email llega a nadie.
export const CUENTAS_DEMO = [1, 2, 3] as const;
export type NumeroDemo = (typeof CUENTAS_DEMO)[number];

export function emailDemo(numero: NumeroDemo): string {
  return `demo${numero}@example.com`;
}

// Lee el número que llega del botón («1», «2» o «3»). Cualquier otra cosa: null.
export function leerNumeroDemo(valor: unknown): NumeroDemo | null {
  if (typeof valor !== "string") return null;
  const n = Number(valor.trim());
  return CUENTAS_DEMO.find((c) => c === n) ?? null;
}

// Usos de la IA al día. Las cuentas demo tienen menos, porque las comparte
// mucha gente y la clave de Groq (gratis) es la misma para toda la app.
export const MAX_USOS_IA_DIA = 20;
export const MAX_USOS_IA_DEMO = 5;

export function topeUsosIA(esDemo: boolean): number {
  return esDemo ? MAX_USOS_IA_DEMO : MAX_USOS_IA_DIA;
}
