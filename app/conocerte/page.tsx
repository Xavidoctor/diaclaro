import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { SaberMas } from "@/app/componentes/saber-mas";
import { cambiarUsarRitmo } from "@/app/conocerte/actions";
import { leerAjustes } from "@/lib/data/ajustes";
import { cargarConocerte } from "@/lib/data/conocerte";
import { diaDeHoy } from "@/lib/data/dia-activo";
import { leerUsarRitmo } from "@/lib/data/ritmo";

export const metadata: Metadata = { title: "Así te conozco" };

// «Así te conozco»: lo que tu asistente ha aprendido de ti en las últimas
// 4 semanas, en frases sencillas y diciendo de dónde sale cada una.
// Son cuentas de la app (sin IA) con lo que tú has apuntado.
export default async function ConocertePage({
  searchParams,
}: PageProps<"/conocerte">) {
  const error = (await searchParams).error === "ritmo";
  const [hoy, ajustes, usarRitmo] = await Promise.all([
    diaDeHoy(),
    leerAjustes(),
    leerUsarRitmo(),
  ]);
  const { rasgos, pendientes } = await cargarConocerte(hoy, ajustes);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/ordenar">Tu asistente</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Así te conozco
          </h1>
          <SaberMas resumen="Lo que he aprendido de ti en las últimas 4 semanas.">
            Son cuentas con lo que tú apuntas (tareas hechas, Foco, «Me voy a
            dormir», días difíciles). No lo adivina ninguna IA y no sale de tu
            cuenta. Si algo no encaja, normalmente es porque faltan días por
            apuntar.
          </SaberMas>
        </header>

        {rasgos.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rasgos.map((r) => (
              <li key={r.id} className="card flex flex-col gap-1 p-4">
                <h2 className="text-sm text-muted">{r.titulo}</h2>
                <p className="font-medium">{r.texto}</p>
                <p className="text-xs text-muted">{r.deDonde}</p>
                {r.id === "ritmo" && (
                  <UsarRitmo usar={usarRitmo} error={error} />
                )}
                {r.corregir && (
                  <Link
                    href={r.corregir.href}
                    className="enlace self-start text-sm"
                  >
                    {r.corregir.texto}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-sm">
            Aún no te conozco lo bastante para decirte nada con seguridad. Sigue
            usando la app con normalidad y vuelve en unos días.
          </p>
        )}

        {pendientes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Aún estoy aprendiendo</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
              {pendientes.map((p) => (
                <li key={p.id}>{p.texto}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

// «¿Lo uso?» debajo de lo que tardas: puedes decirle que cuente solo los
// minutos que tú pones.
function UsarRitmo({ usar, error }: { usar: boolean; error: boolean }) {
  return (
    <form
      action={cambiarUsarRitmo}
      className="mt-1 flex flex-wrap items-center gap-2 text-sm"
    >
      <input type="hidden" name="usar" value={usar ? "no" : "si"} />
      <span>
        {usar
          ? "Lo uso al avisarte, en Día difícil y al organizarte el día."
          : "Ahora no lo uso: cuento solo los minutos que pones tú."}
      </span>
      <button type="submit" className="enlace">
        {usar ? "No lo uses" : "Úsalo"}
      </button>
      {error && (
        <p role="alert" className="w-full text-danger">
          No se ha podido guardar. Puede que falte un paso en la base de datos
          (la migración 20261030470000).
        </p>
      )}
    </form>
  );
}
