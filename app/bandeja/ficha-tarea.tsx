"use client";

import { useActionState } from "react";
import { editarTarea, type EditarTareaState } from "@/app/bandeja/actions";
import type { Tarea } from "@/lib/data/bandeja";
import { opcionesVisibles, type GrupoOpciones } from "@/lib/planner/areas";

// Formulario para cambiar el título, la fecha, los minutos y el proyecto de una tarea.
// Fecha, minutos y proyecto son opcionales: si los dejas vacíos, se quedan vacíos.
export function FichaTarea({
  tarea,
  grupos,
}: {
  tarea: Tarea;
  grupos?: GrupoOpciones[];
}) {
  const [estado, formAction, guardando] = useActionState<
    EditarTareaState,
    FormData
  >(editarTarea, {});
  const opciones = grupos ? opcionesVisibles(grupos, tarea.project_id) : [];

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
      {opciones.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Proyecto (opcional)
          <select
            name="project_id"
            defaultValue={tarea.project_id ?? ""}
            className="input py-2"
          >
            <option value="">Sin proyecto</option>
            {opciones.map((g) => (
              <optgroup key={g.area} label={g.area}>
                {g.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
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
