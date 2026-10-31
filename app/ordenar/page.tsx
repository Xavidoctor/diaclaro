import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { OrdenarConIA } from "@/app/ordenar/ordenar-con-ia";
import { iaDisponible } from "@/lib/ai/groq";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { opcionesProyecto, opcionesVisibles } from "@/lib/planner/areas";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Tu asistente" };

// Tu asistente personal: escribes lo que tienes en la cabeza, de golpe, y la
// IA te propone notas, tareas y citas. Tú lo revisas y guardas lo que quieras.
// Abajo están las otras ayudas de la app, para tenerlas todas en un sitio.
export default async function OrdenarPage() {
  const disponible = iaDisponible();
  const { areas, proyectos } = await cargarOpcionesProyecto();
  const grupos = opcionesVisibles(opcionesProyecto(areas, proyectos), null);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/">Hoy</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Tu asistente
          </h1>
          <SaberMas resumen="Escribe todo de golpe, como te salga.">
            La IA lo separa en tareas, citas, notas, rutinas, hábitos y metas, y
            tú decides qué se guarda.
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

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">También te ayudo con</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/organizar" className="enlace">
                Organízame el día
              </Link>{" "}
              <span className="text-muted">(pongo hora a lo importante)</span>
            </li>
            <li>
              <Link href="/conocerte" className="enlace">
                Así te conozco
              </Link>{" "}
              <span className="text-muted">(lo que he aprendido de ti)</span>
            </li>
            <li>
              <Link href="/cambio" className="enlace">
                Algo ha cambiado hoy
              </Link>{" "}
              <span className="text-muted">(muevo tus planes)</span>
            </li>
            <li>
              <Link href="/dia-dificil" className="enlace">
                Tengo un día difícil
              </Link>{" "}
              <span className="text-muted">(me quedo con lo importante)</span>
            </li>
          </ul>
        </section>

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
      <BarraInferior actual="/" />
    </>
  );
}
