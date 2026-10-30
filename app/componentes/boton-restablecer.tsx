"use client";

import { useState, useTransition } from "react";
import { restablecerCuentaDemo } from "@/app/componentes/acciones-demo";

// Pide confirmación antes de borrar, por si se ha tocado sin querer.
export function BotonRestablecer() {
  const [seguro, setSeguro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, startTransition] = useTransition();

  function restablecer() {
    startTransition(async () => {
      setError(await restablecerCuentaDemo());
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {seguro ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">¿Borrar todo y volver a empezar?</span>
          <button
            type="button"
            onClick={restablecer}
            disabled={cargando}
            className="button-primary py-2 text-sm"
          >
            {cargando ? "Restableciendo…" : "Sí, restablecer"}
          </button>
          <button
            type="button"
            onClick={() => setSeguro(false)}
            disabled={cargando}
            className="text-sm underline"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSeguro(true)}
          className="button-primary self-start py-2 text-sm"
        >
          Restablecer
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
