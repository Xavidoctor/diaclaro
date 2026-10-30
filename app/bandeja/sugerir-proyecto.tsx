"use client";

import { useActionState } from "react";
import {
  ponerProyecto,
  sugerirProyecto,
  type SugerenciaState,
} from "@/app/bandeja/acciones-ia";

// Botón «Sugerir proyecto con IA» en una nota sin proyecto. La IA propone uno
// y tú decides si la nota va ahí. Solo se ve si la app tiene la clave de Groq.
export function SugerirProyecto({ notaId }: { notaId: string }) {
  const [sugerencia, pedir, pensando] = useActionState<
    SugerenciaState,
    FormData
  >(sugerirProyecto, {});
  const [guardado, poner, guardando] = useActionState<
    SugerenciaState,
    FormData
  >(ponerProyecto, {});
  const error = guardado.error ?? sugerencia.error;

  if (guardado.hecho) return null; // la nota ya enseña «Proyecto: …»

  return (
    <div className="flex flex-col gap-1 text-sm">
      {sugerencia.proyecto ? (
        <form action={poner} className="flex flex-wrap items-center gap-x-3">
          <input type="hidden" name="id" value={notaId} />
          <input
            type="hidden"
            name="project_id"
            value={sugerencia.proyecto.id}
          />
          <span>
            La IA propone: <strong>{sugerencia.proyecto.nombre}</strong>
          </span>
          <button
            type="submit"
            disabled={guardando}
            className="underline disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Ponerla ahí"}
          </button>
        </form>
      ) : sugerencia.ninguno ? (
        <p className="text-muted">
          La IA no ve claro a qué proyecto va. Puedes elegirlo tú en «Editar».
        </p>
      ) : (
        <form action={pedir}>
          <input type="hidden" name="id" value={notaId} />
          <button
            type="submit"
            disabled={pensando}
            className="text-muted underline disabled:opacity-60"
          >
            {pensando ? "Pensando…" : "Sugerir proyecto con IA"}
          </button>
        </form>
      )}
      {sugerencia.motivo && (
        <p className="text-xs text-muted">{sugerencia.motivo}</p>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
