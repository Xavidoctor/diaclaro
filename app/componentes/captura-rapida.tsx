"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { capturar, type CapturaState } from "@/app/bandeja/actions";
import { BotonDictar } from "@/app/componentes/boton-dictar";
import { useColaSinConexion } from "@/app/componentes/cola-sin-conexion";

// El cuadro para apuntar algo en segundos: escribes y pulsas Enter.
// Mayúsculas + Enter hace un salto de línea. Escribe #algo para añadir una etiqueta.
// Si no hay conexión, lo guarda en el móvil y lo envía cuando vuelve la red.
// Con conAsistente, al lado del «+» sale el botón de tu asistente: lleva lo
// escrito a /ordenar, donde la IA lo ordena y tú decides qué se guarda.

// El texto viaja por sessionStorage (solo en tu móvil), no en la dirección
// de la página, para que no quede en el historial ni en los registros.
export const CLAVE_TEXTO_ASISTENTE = "diaclaro-asistente-texto";

export function CapturaRapida({
  destino = "nota",
  conAsistente = false,
}: {
  destino?: "nota" | "tarea";
  conAsistente?: boolean;
}) {
  const { pendientes, encolar } = useColaSinConexion();
  const router = useRouter();
  const caja = useRef<HTMLTextAreaElement>(null);
  const [avisoDictado, setAvisoDictado] = useState<string | null>(null);

  function pedirAlAsistente() {
    const texto = caja.current?.value.trim();
    if (!texto) {
      caja.current?.focus();
      return;
    }
    sessionStorage.setItem(CLAVE_TEXTO_ASISTENTE, texto);
    router.push("/ordenar");
  }

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
          ref={caja}
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
        <BotonDictar caja={caja} onAviso={setAvisoDictado} />
        <button
          type="submit"
          disabled={guardando}
          aria-label="Guardar"
          className="button-primary h-12 w-12 shrink-0 p-0 text-2xl leading-none"
        >
          +
        </button>
        {conAsistente && (
          <button
            type="button"
            onClick={pedirAlAsistente}
            aria-label="Pedírselo a tu asistente"
            title="Pedírselo a tu asistente"
            className="button-secondary h-12 w-12 shrink-0 p-0"
          >
            <Sparkles aria-hidden className="mx-auto h-5 w-5" />
          </button>
        )}
      </div>
      {avisoDictado && (
        <p role="alert" className="text-sm text-danger">
          {avisoDictado}
        </p>
      )}
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
                  : conAsistente
                    ? "Enter o + lo guarda como nota. ✨ se lo pide a tu asistente: lo ordena en tareas, citas, rutinas, hábitos…"
                    : "Enter para guardar. Usa #etiqueta si quieres clasificarla."}
        </p>
      )}
    </form>
  );
}
