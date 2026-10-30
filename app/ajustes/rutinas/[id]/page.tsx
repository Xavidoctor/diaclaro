import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarRutina } from "@/app/ajustes/actions";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { leerRutina } from "@/lib/data/rutinas";

export const metadata: Metadata = { title: "Rutina" };

export default async function RutinaPage({
  params,
}: PageProps<"/ajustes/rutinas/[id]">) {
  const { id } = await params;
  const rutina = await leerRutina(id);
  if (!rutina) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/ajustes" className="text-sm underline">
        ← Ajustes
      </Link>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {rutina.title}
      </h1>
      <FormRutina rutina={rutina} />

      <form action={eliminarRutina} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={rutina.id} />
        <details>
          <summary className="cursor-pointer text-sm text-danger">
            Borrar esta rutina
          </summary>
          <p className="mt-2 text-sm text-muted">
            Se borra también el registro de las veces que la hiciste. Si solo
            quieres dejarla de lado un tiempo, mejor púlsale «Pausar» en
            Ajustes.
          </p>
          <button type="submit" className="mt-2 text-sm text-danger underline">
            Sí, borrarla
          </button>
        </details>
      </form>
    </main>
  );
}
