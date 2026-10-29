// Lee la dirección y la clave pública de Supabase.
// Si faltan, el error explica qué hacer en lugar de fallar más tarde sin pista.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copia .env.example a .env.local y rellénalos (ver README).",
    );
  }

  return { url, publishableKey };
}
