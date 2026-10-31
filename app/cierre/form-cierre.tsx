"use client";

import { useActionState } from "react";
import { guardarCierreDelDia, type CierreState } from "@/app/cierre/actions";
import { MAX_TEXTO_CIERRE, type Cierre } from "@/lib/planner/cierre";

// Las dos preguntas del cierre del día. Puedes volver a guardarlas las veces que quieras.
export function FormCierre({
  dia,
  cierre,
}: {
  dia: string;
  cierre: Cierre | null;
}) {
  const [estado, formAction, guardando] = useActionState<CierreState, FormData>(
    guardarCierreDelDia,
    { envios: 0 },
  );
  const valores = estado.valores ?? {
    achieved: cierre?.achieved ?? "",
    change_tomorrow: cierre?.change_tomorrow ?? "",
  };

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="card flex flex-col gap-4"
    >
      <input type="hidden" name="dia" value={dia} />
      <label className="flex flex-col gap-1 text-sm">
        ¿Qué has conseguido hoy?
        <textarea
          name="achieved"
          rows={4}
          maxLength={MAX_TEXTO_CIERRE}
          defaultValue={valores.achieved}
          placeholder="Lo que has hecho, aunque sea pequeño."
          className="input resize-y py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        ¿Qué cambiarías mañana?
        <textarea
          name="change_tomorrow"
          rows={3}
          maxLength={MAX_TEXTO_CIERRE}
          defaultValue={valores.change_tomorrow}
          placeholder="Una sola cosa basta. Te la recordaré mañana en Hoy."
          className="input resize-y py-2"
        />
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={guardando} className="button-primary">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {estado.guardado && (
          <p aria-live="polite" className="text-sm text-muted">
            Guardado. ¡Buen trabajo hoy!
          </p>
        )}
      </div>
    </form>
  );
}
