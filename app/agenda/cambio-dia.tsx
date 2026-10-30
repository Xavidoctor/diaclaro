"use client";

import { useActionState } from "react";
import { moverDia, type CambioDiaState } from "@/app/agenda/actions";

// Mover un solo día de un evento que se repite, o cambiarle la hora.
export function CambioDia({
  id,
  dia,
  nuevoDia,
  horaInicio,
  horaFin,
}: {
  id: string;
  dia: string;
  nuevoDia: string;
  horaInicio: string | null;
  horaFin: string | null;
}) {
  const [estado, formAction, guardando] = useActionState<
    CambioDiaState,
    FormData
  >(moverDia, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dia" value={dia} />
      <label className="flex flex-col gap-1 text-sm">
        Pasa al día
        <input
          name="new_date"
          type="date"
          required
          defaultValue={nuevoDia}
          className="input py-2"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Empieza (opcional)
          <input
            name="new_start_time"
            type="time"
            defaultValue={horaInicio ?? ""}
            className="input py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Acaba (opcional)
          <input
            name="new_end_time"
            type="time"
            defaultValue={horaFin ?? ""}
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
        className="button-primary self-start py-2"
      >
        {guardando
          ? "Guardando…"
          : estado.guardado
            ? "Guardado"
            : "Guardar este día"}
      </button>
    </form>
  );
}
