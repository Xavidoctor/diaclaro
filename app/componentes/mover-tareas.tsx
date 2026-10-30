"use client";

import { useActionState, useState } from "react";
import { moverTareasA, type MoverTareasState } from "@/app/bandeja/actions";

// Botones para llevar tareas pendientes a otro día:
// «Pasar a hoy» de un toque, u «Otro día» para elegirlo en el calendario.
// Con varias tareas (ids) se mueven todas juntas.
export function MoverTareas({
  ids,
  hoy,
  textoHoy = "Pasar a hoy",
  conOtroDia = true,
}: {
  ids: string[];
  hoy: string;
  textoHoy?: string;
  conOtroDia?: boolean;
}) {
  const [estado, formAction, moviendo] = useActionState<
    MoverTareasState,
    FormData
  >(moverTareasA, {});
  const [eligiendo, setEligiendo] = useState(false);
  const lista = ids.join(",");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <form action={formAction}>
          <input type="hidden" name="ids" value={lista} />
          <input type="hidden" name="dia" value={hoy} />
          <button
            type="submit"
            disabled={moviendo}
            className="button-primary py-2 text-sm"
          >
            {textoHoy}
          </button>
        </form>
        {conOtroDia && (
          <button
            type="button"
            onClick={() => setEligiendo((e) => !e)}
            aria-expanded={eligiendo}
            className="rounded-full bg-secondary px-4 py-2 font-medium"
          >
            Otro día
          </button>
        )}
      </div>

      {eligiendo && (
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="ids" value={lista} />
          <label className="flex flex-col gap-1">
            ¿Qué día?
            <input
              name="dia"
              type="date"
              min={hoy}
              required
              className="input py-2"
            />
          </label>
          <button
            type="submit"
            disabled={moviendo}
            className="button-primary py-2 text-sm"
          >
            Mover
          </button>
        </form>
      )}

      {estado.error && (
        <p role="alert" className="text-danger">
          {estado.error}
        </p>
      )}
    </div>
  );
}
