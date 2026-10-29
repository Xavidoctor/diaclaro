import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aquí llega el enlace del email. Supabase lo manda de una de dos formas:
// - ?code=...                 (lo normal con las plantillas por defecto)
// - ?token_hash=...&type=...  (si algún día se cambia la plantilla)
// En ambos casos abrimos la sesión y vamos a Hoy. Si falla, volvemos a /login.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  const destino = request.nextUrl.clone();
  destino.search = "";
  destino.pathname = "/";
  if (!ok) {
    destino.pathname = "/login";
    destino.searchParams.set("error", "enlace");
  }
  return NextResponse.redirect(destino);
}
