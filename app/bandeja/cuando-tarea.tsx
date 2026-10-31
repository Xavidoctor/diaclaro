"use client";

import { useState } from "react";
import type { Cuando } from "@/lib/planner/bandeja";

// «¿Cuándo?» de una tarea: tres botones y, debajo, solo lo que hace falta.
//   Un día → el día (y si quieres, hora y minutos).
//   Con fecha límite → hasta qué día (y si quieres, cuánto te llevará).
//   Sin día → nada más: se queda pendiente para cuando puedas.
// Va dentro de un formulario: manda "cuando", "due_date", "due_time" y
// "estimated_minutes". Lo que no aplica, el servidor lo deja vacío.

const OPCIONES: { valor: Cuando; titulo: string; detalle: string }[] = [
  { valor: "dia", titulo: "Un día", detalle: "Para hacerla ese día" },
  { valor: "limite", titulo: "Con fecha límite", detalle: "Hasta un día" },
  { valor: "sin", titulo: "Sin día", detalle: "Cuando puedas" },
];

export function CuandoTarea({
  inicial,
  dia,
  hora,
  minutos,
}: {
  inicial: Cuando;
  dia?: string | null;
  hora?: string | null;
  minutos?: number | string | null;
}) {
  const [cuando, setCuando] = useState<Cuando>(inicial);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm">¿Cuándo?</legend>
      <input type="hidden" name="cuando" value={cuando} />
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={cuando === o.valor}
            onClick={() => setCuando(o.valor)}
            className={`flex min-h-11 flex-col items-start rounded-xl border px-2 py-2 text-left text-sm ${
              cuando === o.valor
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            <span className="font-medium leading-tight">{o.titulo}</span>
            <span
              className={`text-xs ${cuando === o.valor ? "opacity-90" : "text-muted"}`}
            >
              {o.detalle}
            </span>
          </button>
        ))}
      </div>

      <div
        className={`grid gap-2 text-sm ${cuando === "dia" ? "grid-cols-3" : "grid-cols-2"}`}
      >
        <label
          className={`flex flex-col gap-1 ${cuando === "sin" ? "hidden" : ""}`}
        >
          {cuando === "limite" ? "Hasta el día" : "Día"}
          <input
            name="due_date"
            type="date"
            defaultValue={dia ?? ""}
            required={cuando !== "sin"}
            className="input py-2"
          />
        </label>
        <label
          className={`flex flex-col gap-1 ${cuando === "dia" ? "" : "hidden"}`}
        >
          Hora
          <input
            name="due_time"
            type="time"
            defaultValue={hora ?? ""}
            className="input py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          {cuando === "limite" ? "Minutos en total" : "Minutos"}
          <input
            name="estimated_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            defaultValue={minutos ?? ""}
            placeholder="Opcional"
            className="input py-2"
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        {cuando === "dia" &&
          "Sale en Hoy ese día. Con hora y minutos, ocupa ese rato en la Agenda."}
        {cuando === "limite" &&
          "Sale en Hoy cada día hasta esa fecha, con los días que te quedan."}
        {cuando === "sin" &&
          "Se queda pendiente en Hoy, en «Cuando puedas», sin fecha."}
      </p>
    </fieldset>
  );
}
