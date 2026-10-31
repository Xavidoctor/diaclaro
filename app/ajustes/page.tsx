import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FormAjustes } from "@/app/ajustes/form-ajustes";
import { FormSecciones } from "@/app/ajustes/form-secciones";
import { SeccionGoogle } from "@/app/ajustes/seccion-google";
import { InterruptorAyuda } from "@/app/componentes/ayuda-guia";
import { BotonRecorrido } from "@/app/componentes/recorrido-guiado";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarRutinas } from "@/lib/data/rutinas";
import { leerSecciones } from "@/lib/data/secciones";
import { describirRepeticion, leerRegla } from "@/lib/planner/agenda";
import { textoFranja, textoVeces } from "@/lib/planner/rutinas";
import { SaberMas } from "@/app/componentes/saber-mas";

export const metadata: Metadata = { title: "Ajustes" };

// Ajustes: tus horas habituales, la zona horaria, tus rutinas y Google Calendar.
export default async function AjustesPage({
  searchParams,
}: PageProps<"/ajustes">) {
  const { google } = await searchParams;
  const [ajustes, rutinas, secciones] = await Promise.all([
    leerAjustes(),
    listarRutinas(),
    leerSecciones(),
  ]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Ajustes</h1>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Tus horas</h2>
          <FormAjustes ajustes={ajustes} />
        </section>

        <SeccionGoogle
          mensaje={typeof google === "string" ? google : undefined}
        />

        <section className="flex flex-col gap-3">
          <header className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Rutinas</h2>
            <Link
              href="/ajustes/rutinas/nuevo"
              className="button-primary gap-1 py-2 text-sm"
            >
              <Plus aria-hidden className="size-4" />
              Añadir
            </Link>
          </header>
          <SaberMas resumen="Cosas que haces a menudo y sin hora fija.">
            Por ejemplo, pasear al perro. Salen cada día en Hoy para marcarlas
            cuando las hagas.
          </SaberMas>
          {rutinas.length === 0 ? (
            <p className="text-sm text-muted">Aún no tienes rutinas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rutinas.map((r) => (
                <li
                  key={r.id}
                  className={`card flex items-start gap-3 p-4 ${r.active ? "" : "opacity-60"}`}
                >
                  <Link
                    href={`/ajustes/rutinas/${r.id}`}
                    className="flex flex-1 flex-col gap-1"
                  >
                    <span className="break-words">{r.title}</span>
                    <span className="text-sm text-muted">
                      {[
                        r.repeat_rule
                          ? describirRepeticion(leerRegla(r.repeat_rule))
                          : "Cada día",
                        textoVeces(r),
                        textoFranja(r),
                        r.active ? "" : "En pausa",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Hábitos</h2>
            <SaberMas resumen="Opcional: lo que quieras observar, sin juicios.">
              Por ejemplo agua, lectura o sueño. Solo salen en Hoy si añades
              alguno.
            </SaberMas>
          </div>
          <Link
            href="/habitos"
            className="button-primary shrink-0 py-2 text-sm"
          >
            Abrir
          </Link>
        </section>

        {/* Empleo y Documentos: se encienden aquí (a quien empieza no le salen). */}
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Secciones de la app</h2>
          <FormSecciones secciones={secciones} />
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Guía de uso</h2>
          <SaberMas resumen="Vuelve a ver cómo se usa la app.">
            <p>
              El recorrido te enseña dónde tocar, paso a paso, como la primera
              vez. La guía explica cada pantalla con más calma.
            </p>
            <p>
              Arriba de Hoy, Agenda, Tareas, Notas y Áreas hay un recuadro
              pequeño de ayuda: puedes ocultarlo si ya lo tienes claro y volver
              a mostrarlo aquí.
            </p>
          </SaberMas>
          <div className="flex flex-wrap gap-2">
            <BotonRecorrido />
            <Link href="/guia" className="button-secondary">
              Leer la guía
            </Link>
            <InterruptorAyuda />
          </div>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Copia de seguridad</h2>
          <SaberMas resumen="Descarga un archivo con todos tus datos.">
            Notas, tareas, agenda, rutinas, áreas, foco, cierres del día y
            hábitos. Hazlo una vez a la semana y guárdalo en un sitio seguro,
            por ejemplo en Google Drive.
          </SaberMas>
          {/* Un enlace normal (no Link): es una descarga, no otra pantalla. */}
          <a href="/exportar" download className="button-primary self-start">
            Descargar copia
          </a>
        </section>
      </main>
      <BarraInferior actual="/ajustes" />
    </>
  );
}
