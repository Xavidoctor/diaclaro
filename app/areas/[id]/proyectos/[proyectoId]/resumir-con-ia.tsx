"use client";

import { useActionState } from "react";
import {
  resumirNotas,
  type ResumenState,
} from "@/app/areas/[id]/proyectos/[proyectoId]/acciones-ia";

// Botón «Resumir con IA»: la IA resume las notas de este proyecto.
// Solo se ve si la app tiene la clave de Groq y el proyecto tiene notas.
export function ResumirConIA({ proyectoId }: { proyectoId: string }) {
  const [estado, pedir, pensando] = useActionState<ResumenState, FormData>(
    resumirNotas,
    {},
  );
  return (
    <div className="flex flex-col gap-2">
      {estado.texto && (
        <div className="card flex flex-col gap-2 text-sm">
          <p className="whitespace-pre-wrap">{estado.texto}</p>
          {estado.aviso && <p className="text-xs text-muted">{estado.aviso}</p>}
          <p className="text-xs text-muted">
            Resumen escrito por una IA: puede equivocarse. No se guarda.
          </p>
        </div>
      )}
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <form action={pedir}>
        <input type="hidden" name="proyecto" value={proyectoId} />
        <button
          type="submit"
          disabled={pensando}
          className="text-sm underline disabled:opacity-60"
        >
          {pensando
            ? "Resumiendo…"
            : estado.texto
              ? "Resumir otra vez"
              : "Resumir las notas con IA"}
        </button>
      </form>
      <p className="text-xs text-muted">
        Al pulsarlo, el texto de estas notas se envía a la IA (Groq) para hacer
        el resumen.
      </p>
    </div>
  );
}
