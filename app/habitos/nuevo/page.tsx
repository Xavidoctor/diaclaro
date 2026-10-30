import type { Metadata } from "next";
import Link from "next/link";
import { FormHabito } from "@/app/habitos/form-habito";
import { esIdea } from "@/lib/planner/habitos";
import { listarRutinas } from "@/lib/data/rutinas";

export const metadata: Metadata = { title: "Añadir hábito" };

// "?idea=tabaco" rellena el formulario con una idea; no guarda nada sola.
export default async function NuevoHabitoPage({
  searchParams,
}: PageProps<"/habitos/nuevo">) {
  const { idea } = await searchParams;
  const rutinas = await listarRutinas();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/habitos" className="text-sm underline">
        ← Hábitos
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir hábito</h1>
      <FormHabito
        idea={esIdea(idea) ? idea : undefined}
        rutinas={rutinas}
      />
    </main>
  );
}
