import type { Metadata } from "next";
import { FormArea } from "@/app/areas/form-area";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";

export const metadata: Metadata = { title: "Añadir área" };

export default function NuevaAreaPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/areas">Áreas</EnlaceVolver>
      <h1 className="text-3xl font-semibold tracking-tight">Añadir área</h1>
      <FormArea />
    </main>
  );
}
