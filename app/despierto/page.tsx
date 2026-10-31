import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonesDespertar } from "@/app/componentes/empiezo-el-dia";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerDiaDeHoy } from "@/lib/data/dia-activo";
import { listarHorasDormir } from "@/lib/data/dormir";
import { leerInicio } from "@/lib/data/inicio-dia";
import { sumarDias } from "@/lib/planner/fechas";
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
  // El día que abres al despertarte (aunque no pulsaras «Me voy a dormir»)
  // y la hora a la que te dormiste la noche antes, por si quieres cambiarla.
  const { abrir } = await leerDiaDeHoy();
  const noche = sumarDias(abrir, -1);
  const [inicio, dormirAnoche] = await Promise.all([
    leerInicio(abrir),
    listarHorasDormir(noche, noche).catch(() => []),
  ]);
  if (estadoDespertar(inicio) === "levantado") redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Buenos días</h1>
      <BotonesDespertar
        inicio={inicio}
        ajustes={ajustesDelDia(ajustes, inicio)}
        anoche={dormirAnoche[0]?.bed_time ?? null}
        grande
        irAHoy
      />
      <Link href="/" className="enlace self-start text-sm">
        Ir a Hoy
      </Link>
    </main>
  );
}
