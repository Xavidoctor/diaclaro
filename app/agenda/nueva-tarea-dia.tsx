"use client";

import { useActionState } from "react";
import { type TareaParaDiaState } from "@/app/bandeja/actions";
import { crearTareaParaDiaOGuardar } from "@/app/bandeja/acciones-sin-conexion";

// Formulario corto para apuntar una tarea en el día elegido del calendario.
// Hora y minutos son opcionales: si no los sabes, déjalos vacíos.
// Con hora y minutos, la tarea ocupa ese rato y sale en la Agenda.
export function NuevaTareaDia({
  dia,
  titulo = "Nueva tarea para este día",
}: {
  dia: string;
  titulo?: string; // en Hoy: «Nueva tarea para hoy»
}) {
  const [estado, formAction, guardando] = useActionState<
    TareaParaDiaState,
    FormData
  >(crearTareaParaDiaOGuardar, { envios: 0 });

  return (
    // "key" vacía el formulario después de cada envío.
    <form
      key={estado.envios}
      action={formAction}
      className="card flex flex-col gap-3 p-4 text-sm"
    >
      <input type="hidden" name="due_date" value={dia} />
      <label className="flex flex-col gap-1">
        {titulo}
        <input
          name="title"
          required
          maxLength={500}
          placeholder="¿Qué quieres hacer?"
          autoFocus
          className="input py-2"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex w-32 flex-col gap-1">
          Hora (opcional)
          <input name="due_time" type="time" className="input py-2" />
        </label>
        <label className="flex w-32 flex-col gap-1">
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
