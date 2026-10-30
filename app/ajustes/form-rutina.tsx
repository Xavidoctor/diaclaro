"use client";

import { useActionState, useState } from "react";
import {
  guardarRutina,
  type FormRutinaState,
  type ValoresFormRutina,
} from "@/app/ajustes/actions";
import Link from "next/link";
import { SaberMas } from "@/app/componentes/saber-mas";
import { DIAS_SEMANA, FRANJAS, leerRegla } from "@/lib/planner/agenda";
import { MINUTOS_AVISO, type Rutina } from "@/lib/planner/rutinas";

// Formulario para crear o cambiar una rutina.
// Arriba, lo justo para añadirla rápido: nombre, días y hora (si la sabes).
// El modo foco y el resto («Más opciones») son opcionales.
// "volver" = "hoy" si entraste desde Hoy: al guardar vuelves allí.
export function FormRutina({
  rutina,
  volver,
}: {
  rutina?: Rutina;
  volver?: "hoy";
}) {
  const [estado, formAction, guardando] = useActionState<
    FormRutinaState,
    FormData
  >(guardarRutina, { envios: 0 });
  const valores = estado.valores ?? valoresIniciales(rutina);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {rutina && <input type="hidden" name="id" value={rutina.id} />}
      {volver && <input type="hidden" name="volver" value={volver} />}
      <Campos key={estado.envios} valores={valores} editando={!!rutina} />
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
    focus: rutina?.focus ? "si" : "",
    focus_alarm_minutes: rutina?.focus_alarm_minutes
      ? String(rutina.focus_alarm_minutes)
      : "",
  };
}

function Campos({
  valores,
  editando,
}: {
  valores: ValoresFormRutina;
  editando: boolean;
}) {
  const [cuando, setCuando] = useState(valores.cuando);
  const [desde, setDesde] = useState(valores.window_start);
  const [foco, setFoco] = useState(valores.focus === "si");

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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">¿A qué hora? (opcional)</legend>
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

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="focus"
              value="si"
              checked={foco}
              onChange={(e) => setFoco(e.target.checked)}
              className="size-4"
            />
            Modo foco
          </label>
          <SaberMas
            className="pl-7"
            resumen="Para concentrarte: estudiar, entrenar, leer…"
          >
            Al empezar la rutina, te recordaré que dejes el móvil lejos y podrás
            poner una cuenta atrás o un cronómetro para medir el tiempo. Al
            terminar, la rutina se apunta como hecha.
          </SaberMas>
        </div>

        {foco && (
          <div className="flex flex-col gap-1">
            <label className="flex flex-col gap-1 text-sm">
              Avisarme antes de empezar
              <select
                name="focus_alarm_minutes"
                defaultValue={valores.focus_alarm_minutes}
                disabled={!desde}
                className="input py-2 disabled:opacity-50"
              >
                <option value="">Sin aviso</option>
                {MINUTOS_AVISO.map((m) => (
                  <option key={m} value={m}>
                    {m} minutos antes
                  </option>
                ))}
              </select>
            </label>
            {desde ? (
              <SaberMas resumen="Por si vienes de comer o de otra cosa.">
                <p>
                  Te llega un aviso al móvil esos minutos antes de las {desde},
                  para que te dé tiempo a terminar lo que estés haciendo y
                  prepararte. Hace falta tener los avisos activados en{" "}
                  <Link href="/habitos/avisos" className="enlace">
                    este dispositivo
                  </Link>
                  .
                </p>
              </SaberMas>
            ) : (
              <p className="text-sm text-muted">
                Para el aviso, pon arriba a qué hora empieza («Desde»).
              </p>
            )}
          </div>
        )}
      </fieldset>

      <details open={editando} className="group flex flex-col gap-4">
        <summary className="cursor-pointer text-sm text-muted">
          Más opciones
        </summary>
        <div className="mt-4 flex flex-col gap-4">
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
        </div>
      </details>
    </>
  );
}
