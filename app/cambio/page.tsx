import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlgoHaCambiado } from "@/app/cambio/algo-ha-cambiado";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { iaDisponible } from "@/lib/ai/groq";

export const metadata: Metadata = { title: "Algo ha cambiado" };

// «Algo ha cambiado»: cuentas qué se ha movido en tus planes y la IA te
// propone los cambios en tu agenda y tus tareas. Tú aceptas cada uno.
export default async function CambioPage() {
  // Se decide al abrir la página (no al publicar) si la IA está configurada.
  await connection();
  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <Link href="/agenda" className="text-sm underline">
          ← Agenda
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Algo ha cambiado
          </h1>
          <p className="text-sm text-muted">
            Cuéntalo con tus palabras: una cita que se cancela o cambia de hora,
            una entrega que se mueve… Te propongo los cambios y tú decides.
          </p>
        </header>

        {iaDisponible() ? (
          <AlgoHaCambiado />
        ) : (
          <p className="card text-sm">
            La IA aún no está configurada en esta app. Puedes cambiar las cosas
            a mano en la{" "}
            <Link href="/agenda" className="underline">
              Agenda
            </Link>{" "}
            o en la{" "}
            <Link href="/bandeja" className="underline">
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
            Lo que escribes aquí, los títulos, días y horas de tu agenda de las
            próximas 3 semanas y los títulos y fechas de tus tareas pendientes.
            Nada de notas ni hábitos. Lo que viene de Google Calendar no se
            envía ni se puede cambiar desde aquí. Si la IA pone un día o una
            hora que no has escrito, la app quita ese cambio.
          </p>
        </details>
      </main>
      <BarraInferior actual="/agenda" />
    </>
  );
}
