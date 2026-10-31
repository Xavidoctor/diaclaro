"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// La puerta de tu asistente personal en Hoy: escribes lo que sea y te lleva
// a /ordenar, donde la IA lo ordena y tú decides qué se guarda.
// El texto viaja por sessionStorage (solo en tu móvil), no en la dirección
// de la página, para que no quede en el historial ni en los registros.
export const CLAVE_TEXTO_ASISTENTE = "diaclaro-asistente-texto";

export function PideseloALaIA() {
  const router = useRouter();
  const [texto, setTexto] = useState("");

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    sessionStorage.setItem(CLAVE_TEXTO_ASISTENTE, limpio);
    router.push("/ordenar");
  }

  return (
    <form onSubmit={enviar} className="card flex flex-col gap-2 p-4">
      <label
        htmlFor="asistente-hoy"
        className="flex items-center gap-2 font-medium"
      >
        <Sparkles aria-hidden className="h-4 w-4" />
        Pídeselo a tu asistente
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="asistente-hoy"
          rows={1}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej.: el jueves entrego la práctica, llamar a la empresa…"
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
          disabled={!texto.trim()}
          className="button-primary h-12 shrink-0"
        >
          Pedir
        </button>
      </div>
      <p className="text-xs text-muted">
        Lo separa en tareas, citas y notas. Nada se guarda sin que lo revises.
      </p>
    </form>
  );
}
