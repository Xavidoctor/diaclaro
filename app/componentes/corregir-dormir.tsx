"use client";

import { useActionState, useState } from "react";
import {
  corregirHoraDeAnoche,
  type CorregirDormirState,
} from "@/app/dormir/acciones";
import {
  MAX_NOTA_TARDE,
  MOTIVOS_TARDE,
  preguntarMotivo,
  type NocheParaCorregir,
} from "@/lib/planner/dormir";

// Enlace pequeño debajo de «Me he levantado»: por si no te dormiste
// justo al pulsar «Me voy a dormir» (o se te olvidó), pones la hora de verdad.
// Si la hora es más tarde de lo previsto, puedes apuntar por qué (opcional):
// luego lo ves en «Tu semana», en «Tus noches».
export function CorregirDormir({ anoche }: { anoche: NocheParaCorregir }) {
  const [estado, formAction, guardando] = useActionState<
    CorregirDormirState,
    FormData
  >(corregirHoraDeAnoche, { envios: 0 });

  return (
    // key: al guardar bien, se cierra y vuelve a leer la hora nueva.
    <details key={estado.envios} className="text-xs text-muted">
      <summary className="cursor-pointer">
        {anoche.hora
          ? `Anoche: a dormir a las ${anoche.hora} · cambiar`
          : "¿A qué hora te dormiste anoche?"}
      </summary>
      <Formulario
        anoche={anoche}
        formAction={formAction}
        guardando={guardando}
        error={estado.error}
      />
    </details>
  );
}

function Formulario({
  anoche,
  formAction,
  guardando,
  error,
}: {
  anoche: NocheParaCorregir;
  formAction: (formData: FormData) => void;
  guardando: boolean;
  error?: string;
}) {
  const [hora, setHora] = useState(anoche.hora ?? "");
  const conMotivo = preguntarMotivo({
    nueva: hora,
    prevista: anoche.prevista,
    guardada: anoche.hora,
  });

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        Me dormí a las (pasada la medianoche, por ejemplo 01:30)
        <input
          type="time"
          name="bed_time"
          required
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="input py-2"
        />
      </label>
      {conMotivo && (
        <fieldset className="flex w-full flex-col gap-2">
          <legend className="mb-1">¿Por qué más tarde? (opcional)</legend>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_TARDE.map((m) => (
              <label
                key={m.valor}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 has-checked:border-primary has-checked:bg-secondary has-checked:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="late_reason"
                  value={m.valor}
                  defaultChecked={anoche.late_reason === m.valor}
                  className="sr-only"
                />
                {m.texto}
              </label>
            ))}
          </div>
          <input
            type="text"
            name="late_note"
            maxLength={MAX_NOTA_TARDE}
            defaultValue={anoche.late_note ?? ""}
            placeholder="¿Qué hacías? Por ejemplo: terminando un trabajo"
            aria-label="¿Qué hacías?"
            className="input py-2"
          />
        </fieldset>
      )}
      <button
        type="submit"
        disabled={guardando}
        className="button-secondary py-2"
      >
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      {error && (
        <p role="alert" className="w-full text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
