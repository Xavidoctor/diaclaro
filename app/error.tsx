"use client";

import Link from "next/link";
import { useEffect } from "react";

// Si algo falla al cargar una pantalla (por ejemplo, se corta la conexión
// con la base de datos), en lugar de la página de error en inglés de Next.js
// sale este aviso, con un botón para volver a intentarlo.
export default function ErrorPantalla({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Queda en la consola del navegador para poder investigarlo.
    console.error(error);
  }, [error]);

  const sinRed = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Algo no ha ido bien
      </h1>
      <p className="text-muted">
        {sinRed
          ? "Parece que no tienes conexión. Cuando vuelva, pulsa «Reintentar»."
          : "No se ha podido cargar esta pantalla. Suele ser algo pasajero: prueba otra vez en unos segundos."}
      </p>
      <p className="text-sm text-muted">
        Lo que ya tenías guardado sigue a salvo.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="button-primary"
        >
          Reintentar
        </button>
        <Link href="/" className="enlace inline-flex min-h-11 items-center">
          Ir a Hoy
        </Link>
      </div>
    </main>
  );
}
