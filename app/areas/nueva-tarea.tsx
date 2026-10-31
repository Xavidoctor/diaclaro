"use client";

import { useActionState } from "react";
import {
  anadirTareaAProyecto,
  type FormState,
  type ValoresTareaProyecto,
} from "@/app/areas/actions";

// Caja para apuntar una tarea directamente dentro del proyecto.
// Con el título basta. Día, hora y minutos van plegados y son opcionales:
// con día, hora y minutos, la tarea ocupa ese rato y sale en la Agenda.
export function NuevaTarea({ proyectoId }: { proyectoId: string }) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresTareaProyecto>,
    FormData
  >(anadirTareaAProyecto, { envios: 0 });
  const v = estado.valores;

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="project_id" value={proyectoId} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="nueva-tarea">
          Nueva tarea
        </label>
        <input
          id="nueva-tarea"
          name="title"
          defaultValue={v?.title ?? ""}
          required
          maxLength={500}
          placeholder="Nueva tarea…"
          className="input flex-1 py-2"
        />
        <button
          type="submit"
          disabled={guardando}
          className="button-primary py-2 text-sm"
        >
          {guardando ? "…" : "Añadir"}
        </button>
      </div>
      <details open={Boolean(v?.due_date || v?.due_time)}>
        <summary className="cursor-pointer text-sm text-muted">
          Poner día y hora (opcional)
        </summary>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Día
            <input
              name="due_date"
              type="date"
              defaultValue={v?.due_date ?? ""}
              className="input py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Hora
            <input
              name="due_time"
              type="time"
              defaultValue={v?.due_time ?? ""}
              className="input py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Minutos
            <input
              name="estimated_minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              defaultValue={v?.estimated_minutes ?? ""}
              className="input py-2"
            />
          </label>
        </div>
      </details>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
