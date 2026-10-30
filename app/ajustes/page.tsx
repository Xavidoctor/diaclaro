import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { pausarRutina } from "@/app/ajustes/actions";
import { FormAjustes } from "@/app/ajustes/form-ajustes";
import { SeccionGoogle } from "@/app/ajustes/seccion-google";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarRutinas } from "@/lib/data/rutinas";
import { describirRepeticion, leerRegla } from "@/lib/planner/agenda";
import { textoFranja, textoVeces } from "@/lib/planner/rutinas";

export const metadata: Metadata = { title: "Ajustes" };

// Ajustes: tus horas habituales, la zona horaria, tus rutinas y Google Calendar.
export default async function AjustesPage({
  searchParams,
}: PageProps<"/ajustes">) {
  const { google } = await searchParams;
  const [ajustes, rutinas] = await Promise.all([
    leerAjustes(),
    listarRutinas(),
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
          <p className="text-sm text-muted">
            Cosas que haces a menudo y sin hora fija, como pasear al perro.
            Salen cada día en Hoy para marcarlas cuando las hagas.
          </p>
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
                      ].join(" · ")}
                    </span>
                  </Link>
                  <form action={pausarRutina}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="activa"
                      value={r.active ? "no" : "si"}
                    />
                    <button type="submit" className="text-sm underline">
                      {r.active ? "Pausar" : "Reanudar"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Hábitos</h2>
            <p className="text-sm text-muted">
              Opcional: apunta lo que quieras observar (tabaco, ejercicio,
              sueño…), sin juicios. Solo salen en Hoy si añades alguno.
            </p>
          </div>
          <Link
            href="/habitos"
            className="button-primary shrink-0 py-2 text-sm"
          >
            Abrir
          </Link>
        </section>

        <section className="card flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Documentos importantes</h2>
            <p className="text-sm text-muted">
              DNI, billetes, entradas… guardados en tu Google Drive para
              tenerlos a mano.
            </p>
          </div>
          <Link
            href="/documentos"
            className="button-primary shrink-0 py-2 text-sm"
          >
            Abrir
          </Link>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Copia de seguridad</h2>
          <p className="text-sm text-muted">
            Descarga un archivo con todos tus datos: notas, tareas, agenda,
            rutinas, áreas, foco, cierres del día y hábitos. Hazlo una vez a la
            semana y guárdalo en un sitio seguro, por ejemplo en Google Drive.
          </p>
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
