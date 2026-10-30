"use client";

import { useActionState } from "react";
import {
  crearTareaParaDia,
  type TareaParaDiaState,
} from "@/app/bandeja/actions";

// Formulario corto para apuntar una tarea en el día elegido del calendario.
// Los minutos son opcionales: si no sabes cuánto tardarás, déjalo vacío.
export function NuevaTareaDia({ dia }: { dia: string }) {
  const [estado, formAction, guardando] = useActionState<
    TareaParaDiaState,
    FormData
  >(crearTareaParaDia, { envios: 0 });

  return (
    // "key" vacía el formulario después de cada envío.
    <form
      key={estado.envios}
      action={formAction}
      className="card flex flex-col gap-3 p-4 text-sm"
    >
      <input type="hidden" name="due_date" value={dia} />
      <label className="flex flex-col gap-1">
        Nueva tarea para este día
        <input
          name="title"
          required
          maxLength={500}
          placeholder="¿Qué quieres hacer?"
          className="input py-2"
        />
      </label>
      <div className="flex items-end gap-3">
        <label className="flex w-36 flex-col gap-1">
          Minutos (opcional)
          <input
            name="estimated_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            className="input py-2"
          />
        </label>
        <button
          type="submit"
          disabled={guardando}
          className="button-primary ml-auto py-2 text-sm"
        >
          {guardando ? "Guardando…" : "Añadir tarea"}
        </button>
      </div>
      {estado.error && (
        <p role="alert" className="text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
