import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archivarProyecto, eliminarProyecto } from "@/app/areas/actions";
import { FormProyecto } from "@/app/areas/form-proyecto";
import { leerArea, leerProyecto } from "@/lib/data/areas";

export const metadata: Metadata = { title: "Proyecto" };

export default async function ProyectoPage({
  params,
}: PageProps<"/areas/[id]/proyectos/[proyectoId]">) {
  const { id, proyectoId } = await params;
  const [area, proyecto] = await Promise.all([
    leerArea(id),
    leerProyecto(proyectoId),
  ]);
  if (!area || !proyecto || proyecto.area_id !== area.id) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href={`/areas/${area.id}`} className="text-sm underline">
        ← {area.name}
      </Link>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {proyecto.name}
      </h1>
      <FormProyecto areaId={area.id} proyecto={proyecto} />

      <section className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
        <form action={archivarProyecto}>
          <input type="hidden" name="id" value={proyecto.id} />
          <input
            type="hidden"
            name="archivar"
            value={proyecto.archived_at ? "no" : "si"}
          />
          <button type="submit" className="underline">
            {proyecto.archived_at
              ? "Recuperar"
              : "Archivar (por ejemplo, al aprobar)"}
          </button>
        </form>
        <form action={eliminarProyecto}>
          <input type="hidden" name="id" value={proyecto.id} />
          <input type="hidden" name="area_id" value={area.id} />
          <details>
            <summary className="cursor-pointer text-danger">Borrar</summary>
            <button type="submit" className="mt-2 text-danger underline">
              Sí, borrarlo
            </button>
          </details>
        </form>
      </section>
    </main>
  );
}
