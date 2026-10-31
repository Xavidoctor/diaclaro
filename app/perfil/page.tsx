import type { Metadata } from "next";
import Link from "next/link";
import { Download, LogOut, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/actions";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { FormPerfil } from "@/app/perfil/form-perfil";
import { leerPerfil } from "@/lib/data/perfil";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu perfil" };

// Tu perfil: nombre, edad, un dato sobre ti y tu frase. Y el botón de salir.
export default async function PerfilPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const perfil = await leerPerfil();

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Tu perfil</h1>

        <section className="card flex flex-col gap-3">
          <FormPerfil perfil={perfil} />
        </section>

        <section className="flex flex-col gap-3">
          <Link
            href="/ajustes"
            className="card flex min-h-14 items-center gap-3 p-4 font-medium"
          >
            <Settings aria-hidden className="size-5 text-primary" />
            Ajustes
          </Link>
          <Link
            href="/instalar"
            className="card flex min-h-14 items-center gap-3 p-4 font-medium"
          >
            <Download aria-hidden className="size-5 text-primary" />
            Instalar la app en el móvil o el ordenador
          </Link>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="card flex min-h-14 w-full items-center gap-3 p-4 text-left font-medium"
            >
              <LogOut aria-hidden className="size-5 text-primary" />
              Salir de DíaClaro
            </button>
          </form>
          <p className="text-sm text-muted">
            Has entrado como {data.claims.email}
          </p>
        </section>
      </main>
      <BarraInferior actual="/perfil" />
    </>
  );
}
