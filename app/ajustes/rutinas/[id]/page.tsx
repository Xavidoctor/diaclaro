import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eliminarRutina, pausarRutina } from "@/app/ajustes/actions";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { SeccionPausa } from "@/app/componentes/seccion-pausa";
import { leerRutina } from "@/lib/data/rutinas";

export const metadata: Metadata = { title: "Rutina" };

// /ajustes/rutinas/<id>?desde=hoy viene de Hoy: al guardar se regresa a Hoy.
export default async function RutinaPage({
  params,
  searchParams,
}: PageProps<"/ajustes/rutinas/[id]">) {
  const { id } = await params;
  const desdeHoy = (await searchParams).desde === "hoy";
  const rutina = await leerRutina(id);
  if (!rutina) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href={desdeHoy ? "/" : "/ajustes"}>
        {desdeHoy ? "Hoy" : "Ajustes"}
      </EnlaceVolver>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {rutina.title}
      </h1>
      <FormRutina rutina={rutina} volver={desdeHoy ? "hoy" : undefined} />

      <SeccionPausa
        accion={pausarRutina}
        id={rutina.id}
        campo="activa"
        activo={rutina.active}
        que="rutina"
      />

      <form action={eliminarRutina} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={rutina.id} />
        {desdeHoy && <input type="hidden" name="volver" value="hoy" />}
        <details>
          <summary className="cursor-pointer text-sm text-danger">
            Borrar esta rutina
          </summary>
          <p className="mt-2 text-sm text-muted">
            Se borra también el registro de las veces que la hiciste. Si solo
            quieres dejarla de lado un tiempo, mejor púlsale «Pausar».
          </p>
          <button type="submit" className="mt-2 text-sm text-danger underline">
            Sí, borrarla
          </button>
        </details>
      </form>
    </main>
  );
}
