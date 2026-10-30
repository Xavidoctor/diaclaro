"use client";

import { useActionState } from "react";
import { guardarAjustesAction, type AjustesState } from "@/app/ajustes/actions";
import { ZONAS_HORARIAS, type Ajustes } from "@/lib/planner/ajustes";

// Horas habituales (todas opcionales) y zona horaria.
export function FormAjustes({ ajustes }: { ajustes: Ajustes }) {
  const [estado, formAction, guardando] = useActionState<
    AjustesState,
    FormData
  >(guardarAjustesAction, {});
  const zonaConocida = ZONAS_HORARIAS.some((z) => z.valor === ajustes.timezone);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Todo es opcional. Si no pones una hora, se queda vacía: la app no se la
        inventa. Más adelante el plan del día las usará para saber cuánto tiempo
        tienes.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Hora
          nombre="wake_time"
          etiqueta="Me levanto"
          valor={ajustes.wake_time}
        />
        <Hora
          nombre="sleep_time"
          etiqueta="Me acuesto"
          valor={ajustes.sleep_time}
        />
        <Hora nombre="lunch_time" etiqueta="Como" valor={ajustes.lunch_time} />
        <Hora
          nombre="dinner_time"
          etiqueta="Ceno"
          valor={ajustes.dinner_time}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Zona horaria
        <select
          name="timezone"
          defaultValue={ajustes.timezone}
          className="input py-2"
        >
          {!zonaConocida && (
            <option value={ajustes.timezone}>{ajustes.timezone}</option>
          )}
          {ZONAS_HORARIAS.map((z) => (
            <option key={z.valor} value={z.valor}>
              {z.nombre}
            </option>
          ))}
        </select>
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
        {guardando ? "Guardando…" : estado.guardado ? "Guardado" : "Guardar"}
      </button>
    </form>
  );
}

function Hora({
  nombre,
  etiqueta,
  valor,
}: {
  nombre: string;
  etiqueta: string;
  valor: string | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {etiqueta}
      <input
        name={nombre}
        type="time"
        defaultValue={valor ?? ""}
        className="input py-2"
      />
    </label>
  );
}
