import type { Metadata } from "next";
import Link from "next/link";
import { FormArea } from "@/app/areas/form-area";

export const metadata: Metadata = { title: "Añadir área" };

export default function NuevaAreaPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/areas" className="text-sm underline">
        ← Áreas
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir área</h1>
      <FormArea />
    </main>
  );
}
