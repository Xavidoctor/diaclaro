"use client";

import { useActionState } from "react";
import {
  corregirHoras,
  type CorregirHorasState,
} from "@/app/componentes/acciones-inicio";
import type { InicioDia } from "@/lib/planner/inicio-dia";

// «Cambiar horas»: para poner a mano la hora a la que te despertaste o te
// levantaste, si no pulsaste el botón en el momento. Se puede dejar una vacía.
// Si nunca pulsaste nada hoy, sirve para apuntarlas después.
export function CorregirHoras({
  inicio,
  texto = "Cambiar horas",
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
        <p className="text-muted">
          Pon la hora aproximada. Puedes dejar una vacía si no la sabes.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            Me desperté a las
            <input
              type="time"
              name="awake_time"
              defaultValue={inicio?.awake_time ?? ""}
              className="input py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Me levanté a las
            <input
              type="time"
              name="start_time"
              defaultValue={inicio?.start_time ?? ""}
              className="input py-2"
            />
          </label>
        </div>
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
          {guardando ? "Guardando…" : "Guardar horas"}
        </button>
      </form>
    </details>
  );
}
