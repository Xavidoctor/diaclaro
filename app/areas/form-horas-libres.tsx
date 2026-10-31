"use client";

import { useActionState } from "react";
import {
  guardarHorasLibres,
  type FormState,
  type ValoresHorasSueno,
} from "@/app/areas/actions";

// Cambiar las horas de sueño de la barra de Áreas.
export function FormHorasLibres({ inicial }: { inicial: ValoresHorasSueno }) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresHorasSueno>,
    FormData
  >(guardarHorasLibres, { envios: 0 });
  const valores = estado.valores ?? inicial;

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-3 pt-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Horas de sueño al día
        <input
          name="sueno"
          inputMode="decimal"
          defaultValue={valores.sueno}
          placeholder="9"
          className="input py-2"
        />
      </label>
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
