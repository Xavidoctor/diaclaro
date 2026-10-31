"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/areas/actions";
import { guardarMeta, type ValoresFormMeta } from "@/app/areas/metas/actions";
import {
  NOMBRE_TIPO,
  partirAviso,
  type Meta,
  type TipoMeta,
} from "@/lib/planner/metas";

// Formulario para añadir o cambiar una meta. A la vista solo lo básico
// (qué, tipo y fecha); el aviso va plegado porque es opcional.
export function FormMeta({
  proyectoId,
  tipos,
  meta,
}: {
  proyectoId: string;
  tipos: TipoMeta[];
  meta?: Meta;
}) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresFormMeta>,
    FormData
  >(guardarMeta, { envios: 0 });
  const aviso = partirAviso(meta?.remind_at ?? null);
  const valores = estado.valores ?? {
    title: meta?.title ?? "",
    kind: meta?.kind ?? tipos[0],
    due_date: meta?.due_date ?? "",
    aviso_dia: aviso.dia,
    aviso_hora: aviso.hora,
  };
  // Si la meta ya tiene un tipo que aquí no se ofrece, se mantiene.
  const opciones = tipos.includes(valores.kind as TipoMeta)
    ? tipos
    : [...tipos, valores.kind as TipoMeta];
  const prefijo = meta ? `meta-${meta.id}` : "meta-nueva";

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="project_id" value={proyectoId} />
      {meta && <input type="hidden" name="id" value={meta.id} />}
      <label className="flex flex-col gap-1 text-sm">
        ¿Qué quieres conseguir?
        <input
          name="title"
          defaultValue={valores.title}
          required
          maxLength={200}
          className="input py-2"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {opciones.length > 1 ? (
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Tipo
            <select
              name="kind"
              defaultValue={valores.kind}
              className="input py-2"
            >
              {opciones.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="kind" value={opciones[0]} />
        )}
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Fecha (opcional)
          <input
            name="due_date"
            type="date"
            defaultValue={valores.due_date}
            className="input py-2"
          />
        </label>
      </div>
      <details open={Boolean(valores.aviso_dia || valores.aviso_hora)}>
        <summary className="cursor-pointer text-sm text-muted">
          Avisarme (opcional)
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            <label
              className="flex flex-1 flex-col gap-1 text-sm"
              htmlFor={`${prefijo}-dia`}
            >
              Día del aviso
              <input
                id={`${prefijo}-dia`}
                name="aviso_dia"
                type="date"
                defaultValue={valores.aviso_dia}
                className="input py-2"
              />
            </label>
            <label
              className="flex flex-1 flex-col gap-1 text-sm"
              htmlFor={`${prefijo}-hora`}
            >
              Hora
              <input
                id={`${prefijo}-hora`}
                name="aviso_hora"
                type="time"
                defaultValue={valores.aviso_hora}
                className="input py-2"
              />
            </label>
          </div>
          <p className="text-sm text-muted">
            Llega al móvil aunque la app esté cerrada, si tienes los avisos
            activados (en Hábitos → Avisos).
          </p>
        </div>
      </details>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-primary self-start py-2 text-sm"
      >
        {guardando ? "Guardando…" : meta ? "Guardar" : "Añadir"}
      </button>
    </form>
  );
}
