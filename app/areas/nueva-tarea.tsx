"use client";

import { useActionState } from "react";
import {
  anadirTareaAProyecto,
  type FormState,
  type ValoresTareaProyecto,
} from "@/app/areas/actions";
import { CuandoTarea } from "@/app/bandeja/cuando-tarea";
import type { Cuando } from "@/lib/planner/bandeja";

// Caja para apuntar una tarea directamente dentro del proyecto.
// Con el título basta. Debajo eliges cuándo: «Un día», «Con fecha límite»
// (como «hacer el tema 1» hasta el viernes) o «Sin día» (lo que sale ya marcado).
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
      <CuandoTarea
        inicial={(v?.cuando as Cuando | undefined) ?? "sin"}
        dia={v?.due_date}
        hora={v?.due_time}
        minutos={v?.estimated_minutes}
      />
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
