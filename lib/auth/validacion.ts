// Comprobaciones del formulario de acceso. Son funciones puras para poder probarlas.

export function normalizarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  // Comprobación sencilla: algo@algo.algo, sin espacios.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizarCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const codigo = valor.replace(/\s/g, "");
  // Supabase envía un código de 6 a 8 cifras según la configuración del proyecto.
  return /^\d{6,8}$/.test(codigo) ? codigo : null;
}
