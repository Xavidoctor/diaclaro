"use client";

import { useActionState } from "react";
import { capturar, type CapturaState } from "@/app/bandeja/actions";
import { useColaSinConexion } from "@/app/componentes/cola-sin-conexion";

// El cuadro para apuntar algo en segundos: escribes y pulsas Enter.
// Mayúsculas + Enter hace un salto de línea. Escribe #algo para añadir una etiqueta.
// Si no hay conexión, lo guarda en el móvil y lo envía cuando vuelve la red.
export function CapturaRapida({
  destino = "nota",
}: {
  destino?: "nota" | "tarea";
}) {
  const { pendientes, encolar } = useColaSinConexion();

  async function accion(prev: CapturaState, formData: FormData) {
    const texto = String(formData.get("texto") ?? "").trim();
    const guardarEnElMovil = (): CapturaState => {
      encolar(texto, destino);
      return { envios: prev.envios + 1 };
    };
    if (texto && !navigator.onLine) return guardarEnElMovil();
    try {
      return await capturar(prev, formData);
    } catch (error) {
      // Un TypeError aquí significa que la petición no ha llegado (sin red).
      if (texto && error instanceof TypeError) return guardarEnElMovil();
      throw error;
    }
  }

  const [estado, formAction, guardando] = useActionState<
    CapturaState,
    FormData
  >(accion, { envios: 0 });
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
            : pendientes > 0
              ? `Sin conexión: ${pendientes === 1 ? "1 captura guardada" : `${pendientes} capturas guardadas`} en el móvil. Se enviarán al volver la red.`
              : estado.envios > 0
                ? esTarea
                  ? "Guardada en Tareas."
                  : "Guardada en Notas."
                : esTarea
                  ? "Enter para guardar la tarea."
                  : "Enter para guardar. Usa #etiqueta si quieres clasificarla."}
        </p>
      )}
    </form>
  );
}
