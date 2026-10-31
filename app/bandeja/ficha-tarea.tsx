"use client";

import { useActionState } from "react";
import { type EditarTareaState } from "@/app/bandeja/actions";
import { editarTareaOGuardar } from "@/app/bandeja/acciones-sin-conexion";
import { CuandoTarea } from "@/app/bandeja/cuando-tarea";
import type { Tarea } from "@/lib/data/bandeja";
import { cuandoDeTarea } from "@/lib/planner/bandeja";
import { opcionesVisibles, type GrupoOpciones } from "@/lib/planner/areas";

// Formulario para cambiar el título, la fecha, la hora, los minutos, la importancia,
// el proyecto y el enlace de una tarea. Todo menos el título es opcional: si lo dejas vacío,
// se queda vacío. La importancia y la fecha dura le dicen a la app qué puede
// proponerte recortar cuando te pasas (lo importante nunca lo toca).
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
  >(editarTareaOGuardar, {});
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
      <CuandoTarea
        inicial={cuandoDeTarea(tarea)}
        dia={tarea.due_date}
        hora={tarea.due_time}
        minutos={tarea.estimated_minutes}
      />
      <div className="flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Importancia
          <select
            name="importance"
            defaultValue={tarea.importance ?? ""}
            className="input py-2"
          >
            <option value="">Sin indicar</option>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label className="flex flex-1 items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            name="hard_deadline"
            value="si"
            defaultChecked={tarea.hard_deadline}
            className="h-5 w-5"
          />
          Fecha que no se puede mover
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
      <label className="flex flex-col gap-1 text-sm">
        Enlace (opcional)
        <input
          name="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={2000}
          defaultValue={tarea.url ?? ""}
          placeholder="Un podcast, una clase, un vídeo…"
          className="input py-2"
        />
      </label>
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
