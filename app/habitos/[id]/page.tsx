import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarHabito } from "@/app/habitos/actions";
import { FormHabito } from "@/app/habitos/form-habito";
import { leerAjustes } from "@/lib/data/ajustes";
import { leerHabito, listarApuntesDeHabito } from "@/lib/data/habitos";
import { fechaCorta, hoyEn, sumarDias } from "@/lib/planner/fechas";
import { textoCantidad } from "@/lib/planner/habitos";
import { listarRutinas } from "@/lib/data/rutinas";
import { EnlaceHistorial } from "@/app/habitos/enlace-historial";

export const metadata: Metadata = { title: "Hábito" };

export default async function HabitoPage({
  params,
}: PageProps<"/habitos/[id]">) {
  const { id } = await params;
  const habito = await leerHabito(id);
  if (!habito) notFound();
  const { timezone } = await leerAjustes();
  const apuntes = await listarApuntesDeHabito(
    id,
    sumarDias(hoyEn(timezone), -13),
  );
  const rutinas = await listarRutinas();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/habitos" className="text-sm underline">
        ← Hábitos
      </Link>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {habito.title}
      </h1>
      <FormHabito habito={habito} rutinas={rutinas} />

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="text-lg font-semibold">Lo apuntado en 14 días</h2>
        <EnlaceHistorial id={habito.id} />
        {apuntes.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay nada apuntado.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {apuntes.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="w-16 shrink-0 text-muted">
                  {fechaCorta(a.on_date)}
                </span>
                <span>{textoCantidad(a.amount, habito.unit)}</span>
                {a.note && (
                  <span className="flex-1 break-words text-muted">
                    {a.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={eliminarHabito} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={habito.id} />
        <details>
          <summary className="cursor-pointer text-sm text-danger">
            Borrar este hábito
          </summary>
          <p className="mt-2 text-sm text-muted">
            Se borra también todo lo apuntado. Si solo quieres dejarlo de lado
            un tiempo, mejor púlsale «Pausar».
          </p>
          <button type="submit" className="mt-2 text-sm text-danger underline">
            Sí, borrarlo
          </button>
        </details>
      </form>
    </main>
  );
}
