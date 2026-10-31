import type { Metadata } from "next";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { deDondeVienes } from "@/app/ajustes/rutinas/volver";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { opcionesProyecto } from "@/lib/planner/areas";

export const metadata: Metadata = { title: "Añadir rutina" };

// /ajustes/rutinas/nuevo?desde=hoy viene del botón «Añadir» de Hoy y
// ?proyecto=<id>, de un proyecto (la rutina sale ya dentro de él).
// Al guardar (o al volver) se regresa allí.
export default async function NuevaRutinaPage({
  searchParams,
}: PageProps<"/ajustes/rutinas/nuevo">) {
  const [origen, { areas, proyectos }] = await Promise.all([
    searchParams.then(deDondeVienes),
    cargarOpcionesProyecto(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href={origen.href}>{origen.texto}</EnlaceVolver>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Añadir rutina</h1>
        <p className="text-sm text-muted">
          Algo que haces a menudo. Con el nombre basta; lo demás, si lo sabes.
        </p>
      </header>
      <FormRutina
        volver={origen.volver}
        grupos={opcionesProyecto(areas, proyectos)}
        proyectoId={origen.proyectoId}
      />
    </main>
  );
}
