"use client";

import { useActionState } from "react";
import { guardarCandidatura, type FormState } from "@/app/empleo/actions";
import {
  ESTADOS,
  NOMBRE_ESTADO,
  type Candidatura,
} from "@/lib/planner/candidaturas";

// Formulario para apuntar o cambiar una candidatura.
// Solo la empresa y el puesto son obligatorios; las fechas se pueden dejar vacías.
export function FormCandidatura({
  candidatura,
}: {
  candidatura?: Candidatura;
}) {
  const [estado, formAction, guardando] = useActionState<FormState, FormData>(
    guardarCandidatura,
    { envios: 0 },
  );
  const valores = estado.valores ?? {
    company: candidatura?.company ?? "",
    role: candidatura?.role ?? "",
    url: candidatura?.url ?? "",
    status: candidatura?.status ?? "por_enviar",
    applied_on: candidatura?.applied_on ?? "",
    next_follow_up: candidatura?.next_follow_up ?? "",
    next_step: candidatura?.next_step ?? "",
    notes: candidatura?.notes ?? "",
  };

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-4"
    >
      {candidatura && <input type="hidden" name="id" value={candidatura.id} />}
      <label className="flex flex-col gap-1 text-sm">
        Empresa
        <input
          name="company"
          defaultValue={valores.company}
          required
          maxLength={120}
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Puesto
        <input
          name="role"
          defaultValue={valores.role}
          required
          maxLength={160}
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Enlace a la oferta (opcional)
        <input
          name="url"
          type="url"
          inputMode="url"
          defaultValue={valores.url}
          placeholder="https://…"
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Estado
        <select
          name="status"
          defaultValue={valores.status}
          className="input py-2"
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTADO[e]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Día que la enviaste (opcional)
        <input
          name="applied_on"
          type="date"
          defaultValue={valores.applied_on}
          className="input py-2"
        />
      </label>
      <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">
          Próximo seguimiento (opcional)
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          ¿Qué día quieres volver a mirarla?
          <input
            name="next_follow_up"
            type="date"
            defaultValue={valores.next_follow_up}
            className="input py-2"
          />
          <span className="text-muted">Ese día te saldrá en Hoy.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ¿Qué harás ese día?
          <input
            name="next_step"
            defaultValue={valores.next_step}
            maxLength={300}
            placeholder="Por ejemplo, escribir para preguntar"
            className="input py-2"
          />
        </label>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={valores.notes}
          placeholder="Con quién hablaste, qué te pidieron…"
          className="input py-2"
        />
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando ? "Guardando…" : candidatura ? "Guardar cambios" : "Añadir"}
      </button>
    </form>
  );
}
