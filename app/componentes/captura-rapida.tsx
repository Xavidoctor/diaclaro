"use client";

import { useActionState } from "react";
import { capturar, type CapturaState } from "@/app/bandeja/actions";

// El cuadro para apuntar algo en segundos: escribes y pulsas Enter.
// Mayúsculas + Enter hace un salto de línea.
export function CapturaRapida({
  destino = "nota",
}: {
  destino?: "nota" | "tarea";
}) {
  const [estado, formAction, guardando] = useActionState<
    CapturaState,
    FormData
  >(capturar, { envios: 0 });
  const esTarea = destino === "tarea";

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="destino" value={destino} />
      <label htmlFor={`captura-${destino}`} className="sr-only">
        {esTarea ? "Nueva tarea" : "Apuntar algo"}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          key={estado.envios}
          id={`captura-${destino}`}
          name="texto"
          rows={1}
          required
          defaultValue={estado.texto ?? ""}
          placeholder={esTarea ? "Nueva tarea…" : "Apunta lo que sea…"}
          className="input min-h-12 flex-1 resize-y"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={guardando}
          aria-label="Guardar"
          className="button-primary h-12 w-12 shrink-0 p-0 text-2xl leading-none"
        >
          +
        </button>
      </div>
      {estado.error ? (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      ) : (
        <p aria-live="polite" className="text-xs text-muted">
          {guardando
            ? "Guardando…"
            : estado.envios > 0
              ? "Guardado en la Bandeja."
              : esTarea
                ? "Enter para guardar la tarea."
                : "Enter para guardar. Decides después si es nota o tarea."}
        </p>
      )}
    </form>
  );
}
