import type { Metadata } from "next";
import Link from "next/link";
import { FormCandidatura } from "@/app/empleo/form-candidatura";

export const metadata: Metadata = { title: "Añadir candidatura" };

export default function NuevaCandidaturaPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/empleo" className="text-sm underline">
        ← Candidaturas
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        Añadir candidatura
      </h1>
      <FormCandidatura />
    </main>
  );
}
