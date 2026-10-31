"use client";

import { useActionState, useId, useState } from "react";
import {
  guardarProyecto,
  type FormState,
  type ValoresFormProyecto,
} from "@/app/areas/actions";
import type { Proyecto } from "@/lib/planner/areas";

// Formulario para crear o cambiar un proyecto de un área.
// El «Tipo» lo escribes tú (Asignatura, Deporte...). Debajo salen como
// botones los que ya usas en esta área, para no tener que escribirlos.
export function FormProyecto({
  areaId,
  proyecto,
  sugerencias,
}: {
  areaId: string;
  proyecto?: Proyecto;
  sugerencias: string[];
}) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresFormProyecto>,
    FormData
  >(guardarProyecto, { envios: 0 });
  const valores = estado.valores ?? {
    name: proyecto?.name ?? "",
    label:
      proyecto?.label ?? (proyecto?.kind === "asignatura" ? "Asignatura" : ""),
    notes: proyecto?.notes ?? "",
    url: proyecto?.url ?? "",
  };

  return (
    <FormularioProyecto
      // Al volver con un error, el campo «Tipo» empieza con lo que escribiste.
      key={estado.envios}
      areaId={areaId}
      proyecto={proyecto}
      sugerencias={sugerencias}
      valores={valores}
      error={estado.error}
      guardando={guardando}
      formAction={formAction}
    />
  );
}

function FormularioProyecto({
  areaId,
  proyecto,
  sugerencias,
  valores,
  error,
  guardando,
  formAction,
}: {
  areaId: string;
  proyecto?: Proyecto;
  sugerencias: string[];
  valores: ValoresFormProyecto;
  error?: string;
  guardando: boolean;
  formAction: (formData: FormData) => void;
}) {
  const idLista = useId();
  const [tipo, setTipo] = useState(valores.label);
  // Botones rápidos: como mucho 4, sin el que ya está escrito.
  const rapidos = sugerencias
    .filter(
      (s) => s.toLocaleLowerCase("es") !== tipo.trim().toLocaleLowerCase("es"),
    )
    .slice(0, 4);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
      <div className="flex flex-col gap-1 text-sm">
        <label className="flex flex-col gap-1">
          Tipo (opcional)
          <input
            name="label"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            list={idLista}
            maxLength={40}
            autoComplete="off"
            placeholder="Asignatura, Deporte…"
            className="input py-2"
          />
        </label>
        <datalist id={idLista}>
          {sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {rapidos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {rapidos.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTipo(s)}
                className="rounded-full bg-secondary px-3 py-1 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
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
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando ? "Guardando…" : proyecto ? "Guardar cambios" : "Añadir"}
      </button>
    </form>
  );
}
