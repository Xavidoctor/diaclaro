import type { Metadata } from "next";
import { FormEvento } from "@/app/agenda/form-evento";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerFechaParam } from "@/lib/planner/agenda";
import { hoyEn } from "@/lib/planner/fechas";

export const metadata: Metadata = { title: "Añadir a la agenda" };

// Pantalla para apuntar un compromiso nuevo. /agenda/nuevo?dia=2026-11-04 lo empieza ese día.
export default async function NuevoEventoPage({
  searchParams,
}: PageProps<"/agenda/nuevo">) {
  const params = await searchParams;
  const dia = leerFechaParam(params.dia, hoyEn((await leerAjustes()).timezone));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/agenda">Agenda</EnlaceVolver>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir</h1>
      <p className="text-sm text-muted">
        Un compromiso con día: una tutoría, una clase, una cita. Para una clase
        extra o un cambio puntual, crea uno que no se repita.
      </p>
      <FormEvento diaInicial={dia} />
    </main>
  );
}
