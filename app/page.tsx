import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/actions";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { SaludoLocal } from "@/app/saludo-local";
import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            <SaludoLocal />
          </h1>
          <form action={cerrarSesion}>
            <button type="submit" className="text-sm text-muted underline">
              Salir
            </button>
          </form>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Apunta algo</h2>
          <CapturaRapida />
        </section>

        <section className="card flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Hoy</h2>
          <p className="text-muted">
            Aquí aparecerá tu día más adelante. De momento, lo que apuntes queda
            en la Bandeja.
          </p>
        </section>

        <p className="text-sm text-muted">
          Has entrado como {data.claims.email}
        </p>
      </main>
      <BarraInferior actual="/" />
    </>
  );
}
