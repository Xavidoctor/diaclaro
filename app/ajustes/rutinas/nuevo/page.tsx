import type { Metadata } from "next";
import Link from "next/link";
import { FormRutina } from "@/app/ajustes/form-rutina";

export const metadata: Metadata = { title: "Añadir rutina" };

export default function NuevaRutinaPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/ajustes" className="text-sm underline">
        ← Ajustes
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir rutina</h1>
      <FormRutina />
    </main>
  );
}
