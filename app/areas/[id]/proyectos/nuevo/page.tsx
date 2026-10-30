import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormProyecto } from "@/app/areas/form-proyecto";
import { leerArea } from "@/lib/data/areas";

export const metadata: Metadata = { title: "Añadir proyecto" };

export default async function NuevoProyectoPage({
  params,
}: PageProps<"/areas/[id]/proyectos/nuevo">) {
  const { id } = await params;
  const area = await leerArea(id);
  if (!area) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href={`/areas/${area.id}`} className="text-sm underline">
        ← {area.name}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir proyecto</h1>
      <FormProyecto areaId={area.id} />
    </main>
  );
}
