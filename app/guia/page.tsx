import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { InterruptorAyuda } from "@/app/componentes/ayuda-guia";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { BotonRecorrido } from "@/app/componentes/recorrido-guiado";
import { AbrirApartado } from "@/app/guia/abrir-apartado";
import { SECCIONES_GUIA } from "@/lib/planner/guia";

export const metadata: Metadata = { title: "Cómo se usa" };

// La guía de uso: una lista de apartados que se abren al tocarlos.
// /guia#bandeja abre la guía en el apartado de la Bandeja.
// Los textos están en lib/planner/guia.ts.
export default function GuiaPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <AbrirApartado />
        <EnlaceVolver href="/">Hoy</EnlaceVolver>
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Cómo se usa DíaClaro
          </h1>
          <p className="text-sm text-muted">
            Toca un apartado para ver cómo funciona. No hace falta leerlo todo:
            vuelve aquí cuando algo no se entienda.
          </p>
          <div>
            <BotonRecorrido />
          </div>
        </header>

        <ul className="flex flex-col gap-2">
          {SECCIONES_GUIA.map((s) => (
            // scroll-mt: deja aire arriba al saltar a /guia#algo.
            <li key={s.id} id={s.id} className="scroll-mt-6">
              {/* details/summary: se abre y se cierra sin JavaScript. */}
              <details className="card group p-0">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4">
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-semibold">{s.titulo}</span>
                    <span className="text-sm text-muted">{s.resumen}</span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="flex flex-col gap-3 px-5 pb-5">
                  <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                    {s.pasos.map((paso) => (
                      <li key={paso}>{paso}</li>
                    ))}
                  </ol>
                  {s.enlace && (
                    <Link
                      href={s.enlace.href}
                      className="enlace self-start text-sm"
                    >
                      {s.enlace.texto}
                    </Link>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">La ayuda de cada pantalla</h2>
          <p className="text-sm text-muted">
            Arriba de Hoy, Agenda, Tareas, Notas y Áreas hay un recuadro pequeño
            para hacer el recorrido o venir aquí. Si ya lo tienes claro, puedes
            quitarlo. La guía y el recorrido siguen en Ajustes para cuando los
            necesites.
          </p>
          <div>
            <InterruptorAyuda />
          </div>
        </section>
      </main>
      <BarraInferior actual="/guia" />
    </>
  );
}
