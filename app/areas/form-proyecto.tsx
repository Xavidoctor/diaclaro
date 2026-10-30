"use client";

import { useActionState } from "react";
import {
  guardarProyecto,
  type FormState,
  type ValoresFormProyecto,
} from "@/app/areas/actions";
import type { Proyecto } from "@/lib/planner/areas";

// Formulario para crear o cambiar un proyecto (o una asignatura) de un área.
export function FormProyecto({
  areaId,
  proyecto,
}: {
  areaId: string;
  proyecto?: Proyecto;
}) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresFormProyecto>,
    FormData
  >(guardarProyecto, { envios: 0 });
  const valores = estado.valores ?? {
    name: proyecto?.name ?? "",
    kind: proyecto?.kind ?? "proyecto",
    notes: proyecto?.notes ?? "",
    url: proyecto?.url ?? "",
  };

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="area_id" value={areaId} />
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="name"
          defaultValue={valores.name}
          required
          maxLength={120}
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select name="kind" defaultValue={valores.kind} className="input py-2">
          <option value="proyecto">Proyecto</option>
          <option value="asignatura">Asignatura</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Enlace (opcional)
        <input
          name="url"
          type="url"
          inputMode="url"
          defaultValue={valores.url}
          placeholder="https://…"
          className="input py-2"
        />
        <span className="text-muted">Por ejemplo, el aula del campus.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={valores.notes}
          className="input py-2"
        />
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando ? "Guardando…" : proyecto ? "Guardar cambios" : "Añadir"}
      </button>
    </form>
  );
}
