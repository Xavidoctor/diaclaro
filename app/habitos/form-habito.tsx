"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  guardarHabito,
  type FormHabitoState,
  type ValoresFormHabito,
} from "@/app/habitos/actions";
import { DIAS_SEMANA, leerRegla } from "@/lib/planner/agenda";
import {
  direccionesDelFormulario,
  IDEAS,
  NOMBRE_DIRECCION,
  horaCorta,
  type Habito,
  type Idea,
} from "@/lib/planner/habitos";
import type { Rutina } from "@/lib/planner/rutinas";

// Formulario para crear o cambiar un hábito.
// Solo el nombre es obligatorio. La meta, si la quieres, la pones tú.
// Para que no agobie, a la vista solo está el nombre; lo demás va dentro
// de «Más opciones». Sin unidad, el hábito se marca con un «Hecho».
export function FormHabito({
  habito,
  idea,
  rutinas,
}: {
  habito?: Habito;
  idea?: Idea;
  rutinas: Pick<Rutina, "id" | "title">[];
}) {
  const [estado, formAction, guardando] = useActionState<
    FormHabitoState,
    FormData
  >(guardarHabito, { envios: 0 });
  const valores = estado.valores ?? valoresIniciales(habito, idea);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {habito && <input type="hidden" name="id" value={habito.id} />}
      <Campos key={estado.envios} valores={valores} rutinas={rutinas} />
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={guardando} className="button-primary">
        {guardando
          ? "Guardando…"
          : habito
            ? "Guardar cambios"
            : "Añadir hábito"}
      </button>
    </form>
  );
}

function valoresIniciales(habito?: Habito, idea?: Idea): ValoresFormHabito {
  const regla = leerRegla(habito?.repeat_rule ?? null);
  const base = habito ?? (idea ? IDEAS[idea] : undefined);
  return {
    title: base?.title ?? "",
    notes: habito?.notes ?? "",
    direction: base?.direction ?? "mas",
    unit: base?.unit ?? "",
    daily_target:
      habito?.daily_target != null ? String(habito.daily_target) : "",
    cuando: regla.tipo === "semanal" ? "algunos" : "todos",
    dias: regla.tipo === "semanal" ? regla.dias : [],
    routine_id: habito?.routine_id ?? "",
    remind_at: habito?.remind_at ? horaCorta(habito.remind_at) : "",
    url: habito?.url ?? "",
  };
}

function Campos({
  valores,
  rutinas,
}: {
  valores: ValoresFormHabito;
  rutinas: Pick<Rutina, "id" | "title">[];
}) {
  const [cuando, setCuando] = useState(valores.cuando);
  const [direccion, setDireccion] = useState(valores.direction);
  // Si ya hay algo puesto en las opciones (al editar), se abren solas.
  const hayOpciones =
    valores.direction !== "mas" ||
    valores.unit !== "" ||
    valores.daily_target !== "" ||
    valores.cuando !== "todos" ||
    valores.remind_at !== "" ||
    valores.routine_id !== "" ||
    valores.url !== "" ||
    valores.notes !== "";

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="title"
          defaultValue={valores.title}
          required
          maxLength={100}
          placeholder="Por ejemplo, Leer o Caminar"
          className="input py-2"
        />
      </label>

      <details open={hayOpciones} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-medium">
          <span className="flex-1">Más opciones</span>
          <span className="text-muted">Todo opcional</span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm">¿Qué quieres?</legend>
            {direccionesDelFormulario(
              valores.direction === "menos" ? "menos" : undefined,
            ).map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="direction"
                  value={d}
                  checked={direccion === d}
                  onChange={() => setDireccion(d)}
                />
                {NOMBRE_DIRECCION[d]}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              ¿Qué cuentas?
              <input
                name="unit"
                defaultValue={valores.unit}
                maxLength={30}
                placeholder="vasos, minutos…"
                className="input py-2"
              />
            </label>
            {direccion !== "observar" && (
              <label className="flex flex-1 flex-col gap-1 text-sm">
                {direccion === "menos"
                  ? "Como mucho al día"
                  : "Al menos al día"}
                <input
                  name="daily_target"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  defaultValue={valores.daily_target}
                  className="input py-2"
                />
              </label>
            )}
          </div>
          <p className="-mt-2 text-sm text-muted">
            Si lo dejas vacío, solo marcas «Hecho».
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm">¿Qué días sale en Hoy?</legend>
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

          <label className="flex flex-col gap-1 text-sm">
            Recordármelo a las
            <input
              name="remind_at"
              type="time"
              defaultValue={valores.remind_at}
              className="input py-2"
            />
            <span className="text-muted">
              Te avisa si a esa hora aún no has apuntado nada.
            </span>
          </label>

          {rutinas.length > 0 && (
            <label className="flex flex-col gap-1 text-sm">
              Unir con una rutina
              <select
                name="routine_id"
                defaultValue={valores.routine_id}
                className="input py-2"
              >
                <option value="">Sin unir</option>
                {rutinas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <span className="text-muted">
                Al marcar la rutina como hecha, aquí se suma 1.
              </span>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Enlace
            <input
              name="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={2000}
              defaultValue={valores.url}
              placeholder="Un podcast, una clase, un vídeo…"
              className="input py-2"
            />
            <span className="text-muted">
              En Hoy saldrá un botón para abrirlo con un toque.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Notas
            <textarea
              name="notes"
              rows={2}
              maxLength={2000}
              defaultValue={valores.notes}
              placeholder="Por qué te importa, qué te ayuda…"
              className="input py-2"
            />
          </label>
        </div>
      </details>
    </>
  );
}
