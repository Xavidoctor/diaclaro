"use client";

import { useActionState } from "react";
import { editarTarea, type EditarTareaState } from "@/app/bandeja/actions";
import type { Tarea } from "@/lib/data/bandeja";

// Formulario para cambiar el título, la fecha y los minutos de una tarea.
// Fecha y minutos son opcionales: si los dejas vacíos, se quedan vacíos.
export function FichaTarea({ tarea }: { tarea: Tarea }) {
  const [estado, formAction, guardando] = useActionState<
    EditarTareaState,
    FormData
  >(editarTarea, {});

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="id" value={tarea.id} />
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          name="title"
          defaultValue={tarea.title}
          required
          className="input py-2"
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Fecha (opcional)
          <input
            name="due_date"
            type="date"
            defaultValue={tarea.due_date ?? ""}
            className="input py-2"
          />
        </label>
        <label className="flex w-32 flex-col gap-1 text-sm">
          Minutos (opcional)
          <input
            name="estimated_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            defaultValue={tarea.estimated_minutes ?? ""}
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
            : "Guardar cambios"}
      </button>
    </form>
  );
}
