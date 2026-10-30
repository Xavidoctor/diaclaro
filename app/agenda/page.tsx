import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import {
  agruparPorDia,
  leerFechaParam,
  ocurrenciasEntre,
  textoHora,
} from "@/lib/planner/agenda";
import { diasDesde, hoyEn, nombreDia, sumarDias } from "@/lib/planner/fechas";

export const metadata: Metadata = { title: "Agenda" };

const DIAS_VISTA = 14;

// La Agenda: tus compromisos de los próximos 14 días, día por día.
// /agenda?desde=2026-11-09 enseña los 14 días desde esa fecha.
export default async function AgendaPage({
  searchParams,
}: PageProps<"/agenda">) {
  const params = await searchParams;
  const hoy = hoyEn();
  const desde = leerFechaParam(params.desde, hoy);
  const dias = diasDesde(desde, DIAS_VISTA);
  const hasta = dias.at(-1)!;

  const eventos = await listarEventosHasta(hasta);
  const excepciones = await listarExcepciones(eventos.map((e) => e.id));
  const porDia = agruparPorDia(
    ocurrenciasEntre(eventos, excepciones, desde, hasta),
    dias,
  );

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
          <Link href="/agenda/nuevo" className="button-primary py-2 text-sm">
            Añadir
          </Link>
        </header>

        <nav aria-label="Cambiar de días" className="flex gap-4 text-sm">
          <Link
            href={`/agenda?desde=${sumarDias(desde, -DIAS_VISTA)}`}
            className="underline"
          >
            ← Anteriores
          </Link>
          {desde !== hoy && (
            <Link href="/agenda" className="underline">
              Hoy
            </Link>
          )}
          <Link
            href={`/agenda?desde=${sumarDias(desde, DIAS_VISTA)}`}
            className="ml-auto underline"
          >
            Siguientes →
          </Link>
        </nav>

        {eventos.length === 0 && (
          <p className="card text-muted">
            Aún no hay nada en tu agenda. Pulsa «Añadir» para apuntar tus
            compromisos, como las tutorías o las clases. Si no sabes la hora
            exacta, puedes dejarla vacía o elegir solo «por la tarde».
          </p>
        )}

        <ol className="flex flex-col gap-5">
          {porDia.map(({ fecha, ocurrencias }) => (
            <li key={fecha} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                <span className="first-letter:uppercase">
                  {nombreDia(fecha)}
                </span>
                {fecha === hoy && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs normal-case text-primary-foreground">
                    Hoy
                  </span>
                )}
              </h2>
              {ocurrencias.length === 0 ? (
                <p className="text-sm text-muted">Nada apuntado.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {ocurrencias.map((o) => (
                    <li key={`${o.eventoId}|${o.fechaOriginal}`}>
                      <Link
                        href={`/agenda/${o.eventoId}?dia=${o.fechaOriginal}`}
                        className="card flex items-baseline gap-3 p-4"
                      >
                        <span className="w-28 shrink-0 text-sm text-muted">
                          {textoHora(o)}
                        </span>
                        <span className="flex-1 break-words">{o.titulo}</span>
                        {o.cambiada && (
                          <span className="text-xs text-muted">Cambiado</span>
                        )}
                        {!o.cambiada && o.seRepite && (
                          <span
                            aria-label="Se repite"
                            className="text-xs text-muted"
                          >
                            ↻
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </main>
      <BarraInferior actual="/agenda" />
    </>
  );
}
