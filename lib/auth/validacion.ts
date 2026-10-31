// Comprobaciones del acceso. Son funciones puras para poder probarlas.

export function normalizarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  // Comprobación sencilla: algo@algo.algo, sin espacios.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// Dirección a la que vuelve el enlace del email: <dirección de la web>/auth/confirm.
// Usa la cabecera "origin" del navegador; si falta, la monta con el host.
export function enlaceDeVuelta(cabeceras: {
  origin: string | null;
  host: string | null;
  proto: string | null;
}): string | null {
  const base =
    cabeceras.origin ??
    (cabeceras.host ? `${cabeceras.proto ?? "https"}://${cabeceras.host}` : null);
  return base ? `${base}/auth/confirm` : null;
}

// El código de 6 cifras del email (Supabase puede usar de 6 a 10).
// Quita los espacios por si lo pegas como «123 456».
export function normalizarCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const codigo = valor.replace(/\s/g, "");
  return /^\d{6,10}$/.test(codigo) ? codigo : null;
}
