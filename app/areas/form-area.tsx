"use client";

import { useActionState } from "react";
import {
  guardarArea,
  type FormState,
  type ValoresFormArea,
} from "@/app/areas/actions";
import { minutosAHorasTexto, type Area } from "@/lib/planner/areas";
import { COLORES_AREA, VERDE_OSCURO } from "@/lib/planner/colores";

// Formulario para crear o cambiar un área. Solo el nombre es obligatorio.
export function FormArea({ area }: { area?: Area }) {
  const [estado, formAction, guardando] = useActionState<
    FormState<ValoresFormArea>,
    FormData
  >(guardarArea, { envios: 0 });
  const valores = estado.valores ?? {
    name: area?.name ?? "",
    horas: minutosAHorasTexto(area?.weekly_minutes ?? null),
    personal_time: area?.personal_time ?? false,
    color: area?.color ?? "",
  };

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-4"
    >
      {area && <input type="hidden" name="id" value={area.id} />}
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="name"
          defaultValue={valores.name}
          required
          maxLength={80}
          placeholder="Por ejemplo, Estudios"
          className="input py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Horas a la semana (opcional)
        <input
          name="horas"
          inputMode="decimal"
          defaultValue={valores.horas}
          placeholder="Por ejemplo, 6 o 1,5"
          className="input py-2"
        />
        <span className="text-muted">
          Lo que quieres darle cada semana. Puedes cambiarlo cuando quieras.
        </span>
      </label>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">Color (opcional)</legend>
        <div className="flex flex-wrap gap-3">
          {[
            { clave: "", nombre: "Sin color (verde)", hex: VERDE_OSCURO },
            ...COLORES_AREA,
          ].map((c) => (
            <label key={c.clave} className="cursor-pointer" title={c.nombre}>
              <input
                type="radio"
                name="color"
                value={c.clave}
                defaultChecked={valores.color === c.clave}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="block size-9 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
                style={{ backgroundColor: c.hex }}
              />
              <span className="sr-only">{c.nombre}</span>
            </label>
          ))}
        </div>
        <span className="text-muted">
          Sus tareas y rutinas salen de este color en la Agenda.
        </span>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="personal_time"
          value="si"
          defaultChecked={valores.personal_time}
          className="mt-1 size-4"
        />
        <span>
          Es tiempo personal
          <span className="block text-muted">
            Un hobby, sin objetivo obligatorio. Sus horas son un máximo, no una
            meta, y nunca le quitan tiempo a lo demás.
          </span>
        </span>
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando ? "Guardando…" : area ? "Guardar cambios" : "Añadir área"}
      </button>
    </form>
  );
}
