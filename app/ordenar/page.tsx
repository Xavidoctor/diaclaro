import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { OrdenarConIA } from "@/app/ordenar/ordenar-con-ia";
import { iaDisponible } from "@/lib/ai/groq";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { opcionesProyecto, opcionesVisibles } from "@/lib/planner/areas";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Ordenar con IA" };

// Ordenar con IA: escribes lo que tienes en la cabeza, de golpe, y la IA te
// propone notas, tareas y citas. Tú lo revisas y guardas lo que quieras.
export default async function OrdenarPage() {
  const disponible = iaDisponible();
  const { areas, proyectos } = await cargarOpcionesProyecto();
  const grupos = opcionesVisibles(opcionesProyecto(areas, proyectos), null);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/bandeja">Notas</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Ordenar con IA
          </h1>
          <SaberMas resumen="Escribe todo de golpe, como te salga.">
            La IA lo separa en tareas, citas y notas, y tú decides qué se
            guarda.
          </SaberMas>
        </header>

        {disponible ? (
          <OrdenarConIA grupos={grupos} />
        ) : (
          <p className="card text-sm">
            La IA aún no está configurada en esta app. Mientras tanto, apunta
            las cosas en la{" "}
            <Link href="/bandeja" className="enlace">
              Bandeja
            </Link>
            .
          </p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-muted">
            ¿Qué se envía a la IA?
          </summary>
          <p className="mt-2 text-muted">
            Solo el texto que escribes aquí, los días de las próximas semanas y
            los nombres de tus proyectos. Nada de tus notas, tareas ni hábitos.
            La IA no puede poner un día, una hora ni una duración que no hayas
            escrito: si lo intenta, la app lo quita y te avisa.
          </p>
        </details>
      </main>
      <BarraInferior actual="/bandeja" />
    </>
  );
}
