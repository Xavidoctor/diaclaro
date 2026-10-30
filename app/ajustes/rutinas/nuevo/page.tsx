import type { Metadata } from "next";
import { FormRutina } from "@/app/ajustes/form-rutina";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";

export const metadata: Metadata = { title: "Añadir rutina" };

// /ajustes/rutinas/nuevo?desde=hoy viene del botón «Añadir» de Hoy:
// al guardar (o al volver) se regresa a Hoy.
export default async function NuevaRutinaPage({
  searchParams,
}: PageProps<"/ajustes/rutinas/nuevo">) {
  const desdeHoy = (await searchParams).desde === "hoy";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href={desdeHoy ? "/" : "/ajustes"}>
        {desdeHoy ? "Hoy" : "Ajustes"}
      </EnlaceVolver>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Añadir rutina</h1>
        <p className="text-sm text-muted">
          Algo que haces a menudo. Con el nombre basta; lo demás, si lo sabes.
        </p>
      </header>
      <FormRutina volver={desdeHoy ? "hoy" : undefined} />
    </main>
  );
}
