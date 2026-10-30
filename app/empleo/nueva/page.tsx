import type { Metadata } from "next";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { FormCandidatura } from "@/app/empleo/form-candidatura";
import { listarAreas } from "@/lib/data/areas";
import { areaPorDefecto } from "@/lib/planner/candidaturas";

export const metadata: Metadata = { title: "Añadir candidatura" };

export default async function NuevaCandidaturaPage() {
  const areas = await listarAreas();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/empleo">Candidaturas</EnlaceVolver>
      <h1 className="text-3xl font-semibold tracking-tight">
        Añadir candidatura
      </h1>
      <FormCandidatura
        areas={areas.filter((a) => !a.archived_at)}
        areaInicial={areaPorDefecto(areas)}
      />
    </main>
  );
}
