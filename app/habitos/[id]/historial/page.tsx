import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  leerHabito,
  listarApuntesDeHabito,
  listarRegistrosDeHabito,
} from "@/lib/data/habitos";
import { fechaCorta, sumarDias } from "@/lib/planner/fechas";
import {
  OPCIONES_SEMANAS,
  leerSemanas,
  lunesDe,
  numero,
  resumenPorSemanas,
  textoCantidad,
  textoMeta,
} from "@/lib/planner/habitos";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Historial del hábito" };

// Historial largo de un hábito, semana a semana (de lunes a domingo).
// Solo describe lo apuntado: sin rachas, sin colores de "bien" o "mal".
export default async function HistorialHabitoPage({
  params,
  searchParams,
}: PageProps<"/habitos/[id]/historial">) {
  const { id } = await params;
  const semanas = leerSemanas((await searchParams).semanas);
  const habito = await leerHabito(id);
  if (!habito) notFound();

  const hoy = await diaDeHoy();
  const desde = sumarDias(lunesDe(hoy), -7 * (semanas - 1));
  const [registros, apuntes] = await Promise.all([
    listarRegistrosDeHabito(habito, desde, hoy),
    listarApuntesDeHabito(id, desde),
  ]);
  const resumen = resumenPorSemanas(habito, registros, hoy, semanas);
  const notas = apuntes.filter((a) => a.note);
  const unidad = habito.unit ? ` ${habito.unit}` : "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href={`/habitos/${id}`} className="text-sm underline">
        ← {habito.title}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          Historial
        </h1>
        <p className="text-sm text-muted">
          {habito.title} · {textoMeta(habito)}
        </p>
      </header>

      <nav aria-label="Cuánto tiempo" className="flex gap-2">
        {OPCIONES_SEMANAS.map((n) => (
          <Link
            key={n}
            href={`/habitos/${id}/historial?semanas=${n}`}
            aria-current={n === semanas ? "page" : undefined}
            className={`rounded-xl border px-3 py-2 text-sm ${
              n === semanas
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {n === 4 ? "1 mes" : n === 13 ? "3 meses" : "6 meses"}
          </Link>
        ))}
      </nav>

      {habito.routine_id && (
        <p className="text-sm text-muted">
          Incluye cada vez que marcaste su rutina como hecha.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {resumen.map((s) => (
          <li key={s.lunes} className="card flex flex-col gap-1 p-4 text-sm">
            <span className="font-medium">
              Semana del {fechaCorta(s.lunes)}
              {s.dias < 7 ? " (esta semana)" : ""}
            </span>
            {s.diasConApuntes === 0 ? (
              <span className="text-muted">Nada apuntado.</span>
            ) : (
              <>
                <span>
                  Total: {textoCantidad(s.total, habito.unit)} ·{" "}
                  {s.diasConApuntes} de {s.dias} días apuntados
                </span>
                {s.media !== null && (
                  <span className="text-muted">
                    Media de los días apuntados: {numero(s.media)}
                    {unidad} al día
                  </span>
                )}
                {s.diasEnMeta !== null && (
                  <span className="text-muted">
                    Dentro de tu meta: {s.diasEnMeta} de {s.diasConApuntes} días
                    apuntados
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="text-lg font-semibold">Tus notas</h2>
        {notas.length === 0 ? (
          <p className="text-sm text-muted">
            En este tiempo no has escrito notas. Puedes añadir una con «Otra
            cantidad» al apuntar.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {notas.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="w-16 shrink-0 text-muted">
                  {fechaCorta(a.on_date)}
                </span>
                <span className="flex-1 break-words">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
