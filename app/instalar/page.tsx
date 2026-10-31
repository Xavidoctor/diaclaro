import type { Metadata } from "next";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { InstalarApp } from "@/app/instalar/instalar-app";

export const metadata: Metadata = { title: "Instalar la app" };

// «Instalar la app»: cómo tener DíaClaro como una app en el móvil y el
// ordenador. Se puede abrir sin haber entrado, para enviársela a un amigo.
// Los pasos están en lib/planner/instalar.ts.
export default function InstalarPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <EnlaceVolver href="/">Hoy</EnlaceVolver>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Instalar la app
        </h1>
        <p className="text-sm text-muted">
          Gratis y sin tienda de apps: DíaClaro se queda con su icono, como
          cualquier otra app. Entra con el mismo email en el móvil, el
          ordenador y la web, y verás lo mismo en todos.
        </p>
      </header>
      <InstalarApp />
    </main>
  );
}
