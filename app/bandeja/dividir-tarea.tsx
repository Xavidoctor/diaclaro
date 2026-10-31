"use client";

import { useActionState } from "react";
import {
  guardarPasos,
  proponerPasos,
  type PasosState,
} from "@/app/bandeja/acciones-ia";

// «Divide esta tarea en pasos», dentro de «Editar». La IA propone pasos
// pequeños y tú los cambias, borras o añades en el cuadro antes de guardar.
// Solo se ve si la app tiene la clave de Groq.
export function DividirTarea({ tareaId }: { tareaId: string }) {
  const [propuesta, pedir, pensando] = useActionState<PasosState, FormData>(
    proponerPasos,
    {},
  );
  const [guardado, guardar, guardando] = useActionState<PasosState, FormData>(
    guardarPasos,
    {},
  );
  const error = guardado.error ?? propuesta.error;

  if (guardado.guardados)
    return (
      <p aria-live="polite" className="text-sm text-muted">
        {guardado.guardados === 1
          ? "Guardado 1 paso como tarea."
          : `Guardados ${guardado.guardados} pasos como tareas.`}{" "}
        Empieza por el primero. Esta tarea se queda: márcala cuando acabes.
      </p>
    );

  return (
    <div className="flex flex-col gap-2 text-sm">
      {propuesta.texto ? (
        <form action={guardar} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={tareaId} />
          <label className="flex flex-col gap-1">
            Pasos que propone la IA (cámbialos si quieres, uno por línea)
            <textarea
              name="pasos"
              defaultValue={propuesta.texto}
              rows={Math.min(8, propuesta.texto.split("\n").length + 1)}
              className="input py-2"
            />
          </label>
          <p className="text-xs text-muted">
            El primero es pequeño a propósito: es para arrancar. Cada paso se
            guarda como una tarea con el mismo día y proyecto.
          </p>
          <button
            type="submit"
            disabled={guardando}
            className="button-primary self-start py-2 text-sm"
          >
            {guardando ? "Guardando…" : "Guardar pasos"}
          </button>
        </form>
      ) : propuesta.noHaceFalta ? (
        <p className="text-muted">
          La IA cree que esta tarea ya es un paso sencillo. ¡A por ella!
        </p>
      ) : (
        <form action={pedir}>
          <input type="hidden" name="id" value={tareaId} />
          <button
            type="submit"
            disabled={pensando}
            className="text-muted underline disabled:opacity-60"
          >
            {pensando ? "Pensando…" : "Dividir en pasos con IA"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
