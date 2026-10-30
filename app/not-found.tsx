import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No encontrado" };

// Sale cuando una dirección no existe o algo se ha borrado (por ejemplo, un
// proyecto o una candidatura). Antes salía el aviso de Next.js en inglés.
export default function NoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Aquí no hay nada
      </h1>
      <p className="text-muted">
        Esta página no existe o lo que buscabas se ha borrado.
      </p>
      <Link href="/" className="button-primary self-start">
        Ir a Hoy
      </Link>
    </main>
  );
}
