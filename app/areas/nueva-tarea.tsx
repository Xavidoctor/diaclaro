"use client";

import { useActionState } from "react";
import { anadirTareaAProyecto, type FormState } from "@/app/areas/actions";

// Caja para apuntar una tarea directamente dentro del proyecto.
export function NuevaTarea({ proyectoId }: { proyectoId: string }) {
  const [estado, formAction, guardando] = useActionState<
    FormState<{ title: string }>,
    FormData
  >(anadirTareaAProyecto, { envios: 0 });

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
          defaultValue={estado.valores?.title ?? ""}
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
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
