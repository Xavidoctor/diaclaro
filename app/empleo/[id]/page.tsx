import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import {
  cambiarEstado,
  eliminarCandidatura,
  quitarDelHistorial,
  seguimientoHecho,
} from "@/app/empleo/actions";
import { FormCandidatura } from "@/app/empleo/form-candidatura";
import { FormNotaHistorial } from "@/app/empleo/historial";
import { listarAreas } from "@/lib/data/areas";
import { leerCandidatura, listarHistorial } from "@/lib/data/candidaturas";
import {
  ESTADOS,
  NOMBRE_ESTADO,
  minutosTotales,
  textoEntrada,
  textoSeguimiento,
} from "@/lib/planner/candidaturas";
import { textoHoras } from "@/lib/planner/areas";
import { fechaCorta } from "@/lib/planner/fechas";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Candidatura" };

// Una candidatura por dentro: su estado, el seguimiento y todos sus datos.
export default async function CandidaturaPage({
  params,
}: PageProps<"/empleo/[id]">) {
  const { id } = await params;
  const [candidatura, historial, areas, hoy] = await Promise.all([
    leerCandidatura(id),
    listarHistorial(id),
    listarAreas(),
    diaDeHoy(),
  ]);
  if (!candidatura) notFound();
  const c = candidatura;
  const area = areas.find((a) => a.id === c.area_id);
  // En el selector: las áreas activas y, si está en una archivada, también esa.
  const areasElegibles = areas.filter(
    (a) => !a.archived_at || a.id === c.area_id,
  );
  const dedicado = minutosTotales(historial);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/empleo">Candidaturas</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="break-words text-3xl font-semibold tracking-tight">
            {c.company}
          </h1>
          <p className="break-words">{c.role}</p>
          <p className="text-sm text-muted">
            {NOMBRE_ESTADO[c.status]}
            {c.applied_on && ` · enviada el ${fechaCorta(c.applied_on)}`}
            {area && (
              <>
                {" · "}
                <Link href={`/areas/${area.id}`} className="enlace">
                  {area.name}
                </Link>
              </>
            )}
          </p>
          {c.url && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="enlace text-sm"
            >
              Ver la oferta
            </a>
          )}
        </header>

        {c.next_follow_up && (
          <section className="card flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">
                Seguimiento: {textoSeguimiento(c.next_follow_up, hoy)}
              </h2>
              {c.next_step && (
                <p className="break-words text-sm">{c.next_step}</p>
              )}
            </div>
            <form action={seguimientoHecho}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="button-primary py-2 text-sm">
                Hecho
              </button>
            </form>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Cambiar estado</h2>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.filter((e) => e !== c.status).map((e) => (
              <form key={e} action={cambiarEstado}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value={e} />
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-1 text-sm"
                >
                  {NOMBRE_ESTADO[e]}
                </button>
              </form>
            ))}
          </div>
          <p className="text-sm text-muted">
            Si la marcas como rechazada o descartada, se quita el seguimiento.
          </p>
        </section>

        {c.notes && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Notas</h2>
            <p className="whitespace-pre-wrap break-words text-sm">{c.notes}</p>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Historial</h2>
          {dedicado > 0 && (
            <p className="text-sm text-muted">
              Le has dedicado {textoHoras(dedicado)} en total.
            </p>
          )}
          <FormNotaHistorial id={c.id} hoy={hoy} />
          {historial.length === 0 ? (
            <p className="text-sm text-muted">
              Aún no hay nada. Los cambios de estado y los seguimientos hechos
              se apuntan solos.
            </p>
          ) : (
            <ol className="flex flex-col gap-2 border-l-2 border-border pl-4">
              {historial.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="w-16 shrink-0 text-muted">
                    {fechaCorta(e.on_date)}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-words">
                    {textoEntrada(e)}
                    {e.minutes && (
                      <span className="text-muted">
                        {" "}
                        · {textoHoras(e.minutes)}
                      </span>
                    )}
                  </span>
                  <form action={quitarDelHistorial}>
                    <input type="hidden" name="entrada" value={e.id} />
                    <button
                      type="submit"
                      aria-label="Quitar del historial"
                      className="px-1 text-muted"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ol>
          )}
        </section>

        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Cambiar datos
          </summary>
          <div className="mt-4">
            <FormCandidatura
              key={JSON.stringify(c)}
              candidatura={c}
              areas={areasElegibles}
            />
          </div>
        </details>

        <section className="border-t border-border pt-4 text-sm">
          <form action={eliminarCandidatura}>
            <input type="hidden" name="id" value={c.id} />
            <details>
              <summary className="cursor-pointer text-danger">
                Borrar esta candidatura
              </summary>
              <p className="mt-2 text-muted">
                Se borra para siempre, con su historial. Si solo ya no sigue
                adelante, mejor márcala como rechazada o descartada.
              </p>
              <button type="submit" className="mt-2 text-danger underline">
                Sí, borrarla
              </button>
            </details>
          </form>
        </section>
      </main>
      <BarraInferior actual="/areas" />
    </>
  );
}
