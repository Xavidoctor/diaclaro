import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eliminarRutina, pausarRutina } from "@/app/ajustes/actions";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { deDondeVienes } from "@/app/ajustes/rutinas/volver";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { SeccionHoraFija } from "@/app/componentes/seccion-hora-fija";
import { SeccionPausa } from "@/app/componentes/seccion-pausa";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { leerRutinasFijas } from "@/lib/data/mover-dia";
import { leerRutina } from "@/lib/data/rutinas";
import { opcionesProyecto } from "@/lib/planner/areas";
import { rutinaFija } from "@/lib/planner/mover-dia";

export const metadata: Metadata = { title: "Rutina" };

// /ajustes/rutinas/<id>?desde=hoy viene de Hoy, ?desde=agenda de la Agenda
// y ?proyecto=<id> de un proyecto: al guardar se regresa allí.
export default async function RutinaPage({
  params,
  searchParams,
}: PageProps<"/ajustes/rutinas/[id]">) {
  const { id } = await params;
  const [rutina, origen, { areas, proyectos }, fijas] = await Promise.all([
    leerRutina(id),
    searchParams.then(deDondeVienes),
    cargarOpcionesProyecto(),
    // Si falta su migración, no sale la sección «Hora fija».
    leerRutinasFijas().catch(() => null),
  ]);
  if (!rutina) notFound();
  // Solo tiene sentido si la rutina tiene alguna hora.
  const conHora =
    Boolean(rutina.window_start) ||
    Boolean(rutina.times_of_day?.some((h) => h !== null));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href={origen.href}>{origen.texto}</EnlaceVolver>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {rutina.title}
      </h1>
      <FormRutina
        rutina={rutina}
        volver={origen.volver}
        grupos={opcionesProyecto(areas, proyectos)}
      />

      {fijas && conHora && (
        <SeccionHoraFija
          id={rutina.id}
          fija={rutinaFija({ ...rutina, fixed_time: fijas.get(rutina.id) })}
        />
      )}

      <SeccionPausa
        accion={pausarRutina}
        id={rutina.id}
        campo="activa"
        activo={rutina.active}
        que="rutina"
      />

      <form action={eliminarRutina} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={rutina.id} />
        {origen.volver && (
          <input type="hidden" name="volver" value={origen.volver} />
        )}
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
