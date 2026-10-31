import type { Metadata } from "next";
import { FormEvento } from "@/app/agenda/form-evento";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { leerFechaParam } from "@/lib/planner/agenda";
import { SaberMas } from "@/app/componentes/saber-mas";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Añadir a la agenda" };

// Pantalla para apuntar un compromiso nuevo. /agenda/nuevo?dia=2026-11-04 lo empieza ese día.
export default async function NuevoEventoPage({
  searchParams,
}: PageProps<"/agenda/nuevo">) {
  const params = await searchParams;
  const dia = leerFechaParam(params.dia, await diaDeHoy());

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/agenda">Agenda</EnlaceVolver>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir</h1>
      <SaberMas resumen="Un compromiso con día: una tutoría, una clase, una cita.">
        Para una clase extra o un cambio puntual, crea uno que no se repita.
      </SaberMas>
      <FormEvento diaInicial={dia} />
    </main>
  );
}
