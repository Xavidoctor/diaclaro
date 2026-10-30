"use client";

import { useActionState, useState } from "react";
import {
  guardarEvento,
  type FormEventoState,
  type ValoresFormEvento,
} from "@/app/agenda/actions";
import {
  DIAS_SEMANA,
  FRANJAS,
  leerRegla,
  type Evento,
} from "@/lib/planner/agenda";

// Formulario para crear o cambiar un evento.
// Solo el nombre y el día son obligatorios: hora, franja y repetición son opcionales.
export function FormEvento({
  evento,
  diaInicial,
}: {
  evento?: Evento;
  diaInicial: string;
}) {
  const [estado, formAction, guardando] = useActionState<
    FormEventoState,
    FormData
  >(guardarEvento, { envios: 0 });

  // Tras un error, el formulario se vuelve a dibujar con lo que habías escrito.
  const valores = estado.valores ?? valoresIniciales(evento, diaInicial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {evento && <input type="hidden" name="id" value={evento.id} />}
      <Campos key={estado.envios} valores={valores} />

      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={guardando} className="button-primary">
        {guardando
          ? "Guardando…"
          : evento
            ? "Guardar cambios"
            : "Añadir a la agenda"}
      </button>
    </form>
  );
}

function valoresIniciales(
  evento: Evento | undefined,
  diaInicial: string,
): ValoresFormEvento {
  const regla = leerRegla(evento?.repeat_rule ?? null);
  return {
    title: evento?.title ?? "",
    notes: evento?.notes ?? "",
    start_date: evento?.start_date ?? diaInicial,
    start_time: evento?.start_time ?? "",
    end_time: evento?.end_time ?? "",
    part_of_day: evento?.part_of_day ?? "",
    repetir: regla.tipo,
    hasta: regla.tipo === "no" ? "" : (regla.hasta ?? ""),
    dias: regla.tipo === "semanal" ? regla.dias : [],
  };
}

function Campos({ valores }: { valores: ValoresFormEvento }) {
  const [repetir, setRepetir] = useState(valores.repetir);
  const [horaInicio, setHoraInicio] = useState(valores.start_time);

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="title"
          defaultValue={valores.title}
          required
          maxLength={200}
          placeholder="Por ejemplo, Tutoría de Contabilidad"
          className="input py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {repetir === "no" ? "Día" : "Primer día"}
        <input
          name="start_date"
          type="date"
          required
          defaultValue={valores.start_date}
          className="input py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Hora (opcional)</legend>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Empieza
            <input
              name="start_time"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="input py-2 text-foreground"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
            Acaba
            <input
              name="end_time"
              type="time"
              defaultValue={valores.end_time}
              disabled={!horaInicio}
              className="input py-2 text-foreground disabled:opacity-50"
            />
          </label>
        </div>
        {!horaInicio && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Si no sabes la hora exacta, elige la parte del día (o déjalo así)
            <select
              name="part_of_day"
              defaultValue={valores.part_of_day}
              className="input py-2 text-foreground"
            >
              <option value="">Sin hora</option>
              {FRANJAS.map((f) => (
                <option key={f} value={f}>
                  Por la {f}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">¿Se repite?</legend>
        <select
          name="repetir"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          className="input py-2"
        >
          <option value="no">No, es una sola vez</option>
          <option value="semanal">Cada semana, algunos días</option>
          <option value="diaria">Cada día</option>
        </select>

        {repetir === "semanal" && (
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

        {repetir !== "no" && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Hasta (opcional; vacío = sin fecha final)
            <input
              name="hasta"
              type="date"
              defaultValue={valores.hasta}
              className="input py-2 text-foreground"
            />
          </label>
        )}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={valores.notes}
          className="input py-2"
        />
      </label>
    </>
  );
}
