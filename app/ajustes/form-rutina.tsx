"use client";

import { useActionState, useState } from "react";
import {
  guardarRutina,
  type FormRutinaState,
  type ValoresFormRutina,
} from "@/app/ajustes/actions";
import { DIAS_SEMANA, FRANJAS, leerRegla } from "@/lib/planner/agenda";
import type { Rutina } from "@/lib/planner/rutinas";

// Formulario para crear o cambiar una rutina.
// Solo el nombre y las veces al día son obligatorios; lo demás, si lo sabes.
export function FormRutina({ rutina }: { rutina?: Rutina }) {
  const [estado, formAction, guardando] = useActionState<
    FormRutinaState,
    FormData
  >(guardarRutina, { envios: 0 });
  const valores = estado.valores ?? valoresIniciales(rutina);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {rutina && <input type="hidden" name="id" value={rutina.id} />}
      <Campos key={estado.envios} valores={valores} />
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando
          ? "Guardando…"
          : rutina
            ? "Guardar cambios"
            : "Añadir rutina"}
      </button>
    </form>
  );
}

function valoresIniciales(rutina?: Rutina): ValoresFormRutina {
  const regla = leerRegla(rutina?.repeat_rule ?? null);
  return {
    title: rutina?.title ?? "",
    notes: rutina?.notes ?? "",
    cuando: regla.tipo === "semanal" ? "algunos" : "todos",
    dias: regla.tipo === "semanal" ? regla.dias : [],
    times_per_day: String(rutina?.times_per_day ?? 1),
    duration_minutes: rutina?.duration_minutes
      ? String(rutina.duration_minutes)
      : "",
    window_start: rutina?.window_start ?? "",
    window_end: rutina?.window_end ?? "",
    part_of_day: rutina?.part_of_day ?? "",
  };
}

function Campos({ valores }: { valores: ValoresFormRutina }) {
  const [cuando, setCuando] = useState(valores.cuando);
  const [desde, setDesde] = useState(valores.window_start);

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="title"
          defaultValue={valores.title}
          required
          maxLength={200}
          placeholder="Por ejemplo, Paseo del perro"
          className="input py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">¿Qué días?</legend>
        <select
          name="cuando"
          value={cuando}
          onChange={(e) => setCuando(e.target.value)}
          className="input py-2"
        >
          <option value="todos">Todos los días</option>
          <option value="algunos">Algunos días de la semana</option>
        </select>
        {cuando === "algunos" && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Días de la semana"
          >
            {DIAS_SEMANA.map((d) => (
              <label
                key={d.codigo}
                className="flex cursor-pointer items-center rounded-xl border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
              >
                <input
                  type="checkbox"
                  name="dias"
                  value={d.codigo}
                  defaultChecked={valores.dias.includes(d.codigo)}
                  className="sr-only"
                />
                <span aria-hidden>{d.corto}</span>
                <span className="sr-only">{d.nombre}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Veces al día
          <input
            name="times_per_day"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            required
            defaultValue={valores.times_per_day}
            className="input py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Minutos cada vez (opcional)
          <input
            name="duration_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            defaultValue={valores.duration_minutes}
            className="input py-2"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Franja (opcional)</legend>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Desde
            <input
              name="window_start"
              type="time"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="input py-2 text-foreground"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Hasta
            <input
              name="window_end"
              type="time"
              defaultValue={valores.window_end}
              disabled={!desde}
              className="input py-2 text-foreground disabled:opacity-50"
            />
          </label>
        </div>
        {!desde && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            O solo la parte del día
            <select
              name="part_of_day"
              defaultValue={valores.part_of_day}
              className="input py-2 text-foreground"
            >
              <option value="">Cuando pueda</option>
              {FRANJAS.map((f) => (
                <option key={f} value={f}>
                  Por la {f}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={valores.notes}
          className="input py-2"
        />
      </label>
    </>
  );
}
