"use client";

import { useActionState } from "react";
import {
  corregirHoras,
  type CorregirHorasState,
} from "@/app/componentes/acciones-inicio";
import type { InicioDia } from "@/lib/planner/inicio-dia";

// «Cambiar hora»: para poner a mano la hora a la que te levantaste, si no
// pulsaste el botón en el momento. Si nunca pulsaste nada hoy, sirve para
// apuntarla después. (Antes había también «Me desperté»: ya no hace falta.)
export function CorregirHoras({
  inicio,
  texto = "Cambiar hora",
}: {
  inicio: InicioDia | null;
  texto?: string;
}) {
  const [estado, formAction, guardando] = useActionState<
    CorregirHorasState,
    FormData
  >(corregirHoras, { envios: 0 });

  return (
    // key: al guardar bien, se cierra y vuelve a leer las horas nuevas.
    <details key={estado.envios} className="text-sm">
      <summary className="cursor-pointer text-muted underline">{texto}</summary>
      <form action={formAction} className="mt-2 flex flex-col gap-3">
        <label className="flex flex-col gap-1 self-start">
          Me levanté a las (aproximada)
          <input
            type="time"
            name="start_time"
            required
            defaultValue={inicio?.start_time ?? inicio?.awake_time ?? ""}
            className="input py-2"
          />
        </label>
        {estado.error && (
          <p role="alert" className="text-danger">
            {estado.error}
          </p>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="button-primary self-start py-2"
        >
          {guardando ? "Guardando…" : "Guardar hora"}
        </button>
      </form>
    </details>
  );
}
