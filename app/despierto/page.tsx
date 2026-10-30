import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonesDespertar } from "@/app/componentes/empiezo-el-dia";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerInicio } from "@/lib/data/inicio-dia";
import { hoyEn } from "@/lib/planner/fechas";
import { ajustesDelDia, estadoDespertar } from "@/lib/planner/inicio-dia";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Buenos días" };

// Pantalla para nada más despertarte. Se abre con el atajo «Estoy despierto»
// (mantén pulsado el icono de DíaClaro). Solo tiene dos botones grandes.
// Si ya te has levantado hoy, te lleva directamente a Hoy.
export default async function DespiertoPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const ajustes = await leerAjustes();
  const inicio = await leerInicio(hoyEn(ajustes.timezone));
  if (estadoDespertar(inicio) === "levantado") redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Buenos días</h1>
      <BotonesDespertar
        inicio={inicio}
        ajustes={ajustesDelDia(ajustes, inicio)}
        grande
        irAHoy
      />
      <Link href="/" className="enlace self-start text-sm">
        Ir a Hoy
      </Link>
    </main>
  );
}
