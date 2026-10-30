"use client";

import { useActionState } from "react";
import { apuntar, type ApunteState } from "@/app/habitos/actions";

// Botón «+1» y, desplegando, otra cantidad con una nota opcional.
// Se usa en la pantalla de Hábitos y en Hoy.
export function Apuntar({
  id,
  unidad,
  conDetalle = true,
  ninguno = false,
}: {
  id: string;
  unidad: string | null;
  conDetalle?: boolean;
  // Botón «Hoy, ninguno» (apunta 0), para hábitos que quieres hacer menos.
  ninguno?: boolean;
}) {
  const [estado, formAction, guardando] = useActionState<ApunteState, FormData>(
    apuntar,
    { envios: 0 },
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex justify-end gap-2">
        <input type="hidden" name="id" value={id} />
        {ninguno && (
          <button
            type="submit"
            name="amount"
            value="0"
            disabled={guardando}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            Hoy, ninguno
          </button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="button-primary py-2 text-sm"
          aria-label={`Apuntar 1 ${unidad ?? "vez"}`}
        >
          +1
        </button>
      </form>
      {conDetalle && (
        <details className="text-sm">
          <summary className="cursor-pointer text-right text-muted underline">
            Otra cantidad
          </summary>
          {/* key: vacía el formulario después de apuntar */}
          <form
            key={estado.envios}
            action={formAction}
            className="mt-2 flex flex-col gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <label className="flex flex-col gap-1">
              ¿Cuánto?{unidad ? ` (${unidad})` : ""}
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                placeholder="1"
                className="input py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              Nota (opcional)
              <input
                name="note"
                maxLength={500}
                placeholder="Qué estabas haciendo, cómo te sentías…"
                className="input py-2"
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="button-primary py-2 text-sm"
            >
              Apuntar
            </button>
          </form>
        </details>
      )}
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </div>
  );
}
