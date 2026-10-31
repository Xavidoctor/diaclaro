import type { Metadata } from "next";
import Link from "next/link";
import { AlgoHaCambiado } from "@/app/cambio/algo-ha-cambiado";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { OrdenarConIA } from "@/app/ordenar/ordenar-con-ia";
import { iaDisponible } from "@/lib/ai/groq";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { opcionesProyecto, opcionesVisibles } from "@/lib/planner/areas";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Tu asistente" };

// Tu asistente personal, la única entrada de IA para apuntar y cambiar cosas:
// - «Algo nuevo» (por defecto): escribes lo que tienes en la cabeza y la IA
//   te propone tareas, citas, notas, rutinas, hábitos y metas.
// - «Algo ha cambiado» (?modo=cambio): cuentas qué se ha movido y la IA te
//   propone los cambios en tu agenda y tus tareas.
// Tú revisas y guardas lo que quieras. Abajo están las otras ayudas.
export default async function OrdenarPage({
  searchParams,
}: PageProps<"/ordenar">) {
  const cambio = (await searchParams).modo === "cambio";
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
          <SaberMas
            resumen={
              cambio
                ? "Cuéntalo con tus palabras y tú decides."
                : "Escribe todo de golpe, como te salga."
            }
          >
            {cambio
              ? "Por ejemplo, una cita que se cancela o cambia de hora, o una entrega que se mueve. Te propongo los cambios y tú aceptas los que quieras."
              : "La IA lo separa en tareas, citas, notas, rutinas, hábitos y metas, y tú decides qué se guarda."}
          </SaberMas>
        </header>

        <nav
          aria-label="Qué quieres contarle"
          className="flex gap-2 rounded-xl bg-secondary p-1 text-sm"
        >
          <Pestana href="/ordenar" activa={!cambio}>
            Algo nuevo
          </Pestana>
          <Pestana href="/ordenar?modo=cambio" activa={cambio}>
            Algo ha cambiado
          </Pestana>
        </nav>

        {!disponible ? (
          <p className="card text-sm">
            La IA aún no está configurada en esta app. Mientras tanto, apunta
            las cosas en la{" "}
            <Link href="/bandeja" className="enlace">
              Bandeja
            </Link>{" "}
            o cámbialas a mano en la{" "}
            <Link href="/agenda" className="enlace">
              Agenda
            </Link>
            .
          </p>
        ) : cambio ? (
          <AlgoHaCambiado />
        ) : (
          <OrdenarConIA grupos={grupos} />
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
              <Link href="/dia-dificil" className="enlace">
                Tengo un día difícil
              </Link>{" "}
              <span className="text-muted">(me quedo con lo importante)</span>
            </li>
            <li>
              <Link href="/conocerte" className="enlace">
                Así te conozco
              </Link>{" "}
              <span className="text-muted">(lo que he aprendido de ti)</span>
            </li>
          </ul>
        </section>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted">
            ¿Qué se envía a la IA?
          </summary>
          <p className="mt-2 text-muted">
            {cambio
              ? "Lo que escribes aquí, los títulos, días y horas de tu agenda de las próximas 3 semanas y los títulos y fechas de tus tareas pendientes. Nada de notas ni hábitos. Lo que viene de Google Calendar no se envía ni se puede cambiar desde aquí. Si la IA pone un día o una hora que no has escrito, la app quita ese cambio."
              : "Solo el texto que escribes aquí, los días de las próximas semanas y los nombres de tus proyectos. Nada de tus notas, tareas ni hábitos. La IA no puede poner un día, una hora ni una duración que no hayas escrito: si lo intenta, la app lo quita y te avisa."}
          </p>
        </details>
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

function Pestana({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      className={`flex-1 rounded-lg px-3 py-2 text-center ${
        activa ? "bg-background font-medium shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}
