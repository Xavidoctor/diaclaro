import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { ListaCandidaturas } from "@/app/empleo/lista";
import { listarCandidaturas } from "@/lib/data/candidaturas";
import {
  contarPorEstado,
  separarCandidaturas,
} from "@/lib/planner/candidaturas";
import { SaberMas } from "@/app/componentes/saber-mas";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Candidaturas" };

// Candidaturas de empleo: a qué ofertas te has presentado y cuándo toca volver a mirarlas.
export default async function EmpleoPage() {
  const [candidaturas, hoy] = await Promise.all([
    listarCandidaturas(),
    diaDeHoy(),
  ]);
  const { activas, cerradas } = separarCandidaturas(candidaturas);
  const resumen = contarPorEstado(activas);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/areas">Áreas</EnlaceVolver>
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Candidaturas
          </h1>
          <Link href="/empleo/nueva" className="button-primary py-2 text-sm">
            Añadir
          </Link>
        </header>

        {candidaturas.length === 0 ? (
          <section className="card flex flex-col gap-2">
            <p>Aún no has apuntado ninguna candidatura.</p>
            <SaberMas resumen="Apunta cada oferta con la empresa y el puesto.">
              Si pones un día de seguimiento, ese día te saldrá en Hoy para que
              no se te olvide llamar o escribir.
            </SaberMas>
          </section>
        ) : (
          <>
            <p className="text-sm text-muted">
              {activas.length === 1 ? "1 activa" : `${activas.length} activas`}
              {resumen.length > 0 &&
                `: ${resumen.map((e) => `${e.total} ${e.nombre.toLowerCase()}`).join(", ")}`}
              .
            </p>
            {activas.length > 0 && (
              <ListaCandidaturas candidaturas={activas} hoy={hoy} />
            )}
            {cerradas.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm text-muted">
                  Cerradas ({cerradas.length})
                </summary>
                <div className="mt-2 opacity-60">
                  <ListaCandidaturas candidaturas={cerradas} hoy={hoy} />
                </div>
              </details>
            )}
          </>
        )}
      </main>
      <BarraInferior actual="/areas" />
    </>
  );
}
