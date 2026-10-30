"use client";

import { useActionState } from "react";
import {
  explicarConIA,
  type ExplicacionState,
} from "@/app/componentes/acciones-ia";
import { SaberMas } from "@/app/componentes/saber-mas";

// Botón "Explícamelo": la IA (Groq, gratis) te cuenta el día con palabras.
// Solo se ve si la app tiene la clave de Groq configurada.
export function ExplicarConIA() {
  const [estado, pedir, pensando] = useActionState<ExplicacionState>(
    explicarConIA,
    {},
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      {estado.texto && (
        <p className="whitespace-pre-wrap rounded-xl bg-background p-3">
          {estado.texto}
        </p>
      )}
      {estado.error && (
        <p role="alert" className="text-danger">
          {estado.error}
        </p>
      )}
      <form action={pedir}>
        <button
          type="submit"
          disabled={pensando}
          className="text-sm underline disabled:opacity-60"
        >
          {pensando
            ? "Pensando…"
            : estado.texto
              ? "Explícamelo otra vez"
              : "Explícamelo con IA"}
        </button>
      </form>
      {estado.texto && (
        <SaberMas resumen="Escrito por una IA: puede equivocarse.">
          Los números y los recortes de arriba los calcula la app.
        </SaberMas>
      )}
    </div>
  );
}
