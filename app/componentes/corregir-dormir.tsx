"use client";

import { useActionState } from "react";
import {
  corregirHoraDeAnoche,
  type CorregirDormirState,
} from "@/app/dormir/acciones";

// Enlace pequeño debajo de «Despierto» y «Levantado»: por si no te dormiste
// justo al pulsar «Me voy a dormir» (o se te olvidó), pones la hora de verdad.
// "anoche" es la hora guardada de la noche anterior, si la hay.
export function CorregirDormir({ anoche }: { anoche: string | null }) {
  const [estado, formAction, guardando] = useActionState<
    CorregirDormirState,
    FormData
  >(corregirHoraDeAnoche, { envios: 0 });

  return (
    // key: al guardar bien, se cierra y vuelve a leer la hora nueva.
    <details key={estado.envios} className="text-xs text-muted">
      <summary className="cursor-pointer">
        {anoche
          ? `Anoche: a dormir a las ${anoche} · cambiar`
          : "¿A qué hora te dormiste anoche?"}
      </summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          Me dormí a las (pasada la medianoche, por ejemplo 01:30)
          <input
            type="time"
            name="bed_time"
            required
            defaultValue={anoche ?? ""}
            className="input py-2"
          />
        </label>
        <button
          type="submit"
          disabled={guardando}
          className="button-secondary py-2"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {estado.error && (
          <p role="alert" className="w-full text-danger">
            {estado.error}
          </p>
        )}
      </form>
    </details>
  );
}
