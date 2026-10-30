"use client";

import { useActionState } from "react";
import { apuntarEnHistorial, type FormStateNota } from "@/app/empleo/actions";

// Formulario pequeño para apuntar algo en el historial de una candidatura.
// El día empieza en hoy, pero lo puedes cambiar (solo hoy o antes).
export function FormNotaHistorial({ id, hoy }: { id: string; hoy: string }) {
  const [estado, formAction, guardando] = useActionState<
    FormStateNota,
    FormData
  >(apuntarEnHistorial, { envios: 0 });
  const valores = estado.valores ?? { on_date: hoy, note: "" };

  return (
    <form
      key={estado.envios}
      action={formAction}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-sm">
        Apunta lo que ha pasado
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
          required
          defaultValue={valores.note}
          placeholder="Por ejemplo, me han llamado para una entrevista"
          className="input py-2"
        />
      </label>
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Día
          <input
            name="on_date"
            type="date"
            max={hoy}
            required
            defaultValue={valores.on_date}
            className="input py-2"
          />
        </label>
        <button
          type="submit"
          disabled={guardando}
          className="button-primary py-2 text-sm"
        >
          {guardando ? "Guardando…" : "Apuntar"}
        </button>
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
