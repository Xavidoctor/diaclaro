"use client";

import { useActionState } from "react";
import {
  guardarHorasLibres,
  type FormState,
  type ValoresHorasDescanso,
} from "@/app/areas/actions";

// Cambiar las horas de sueño y descansos de la barra de Áreas.
export function FormHorasLibres({
  inicial,
}: {
  inicial: ValoresHorasDescanso;
}) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresHorasDescanso>,
    FormData
  >(guardarHorasLibres, { envios: 0 });
  const valores = estado.valores ?? inicial;

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-3 pt-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Sueño al día (h)
          <input
            name="sueno"
            inputMode="decimal"
            defaultValue={valores.sueno}
            placeholder="9"
            className="input py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descansos al día (h)
          <input
            name="descanso"
            inputMode="decimal"
            defaultValue={valores.descanso}
            placeholder="4"
            className="input py-2"
          />
        </label>
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-primary py-2 text-sm"
      >
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
