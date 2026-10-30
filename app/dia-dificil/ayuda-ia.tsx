"use client";

import { useActionState } from "react";
import {
  contarConIA,
  explicarDiaConIA,
  type ContarState,
  type ExplicarDiaState,
} from "@/app/dia-dificil/acciones-ia";
import type { Motivo } from "@/lib/planner/dia-dificil";

// «Cuéntamelo con tus palabras»: en vez de elegir un botón, escribes qué ha
// pasado y la IA elige el motivo. Solo se ve si la app tiene la clave de Groq.
export function ContarConIA() {
  const [estado, enviar, pensando] = useActionState<ContarState, FormData>(
    contarConIA,
    {},
  );
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <label htmlFor="texto-dia" className="text-sm">
        O cuéntamelo con tus palabras
      </label>
      <textarea
        id="texto-dia"
        name="texto"
        rows={2}
        required
        maxLength={500}
        defaultValue={estado.texto ?? ""}
        placeholder="Por ejemplo: me ha llamado mi madre y tengo que ayudarla toda la tarde"
        className="input resize-y"
      />
      <button
        type="submit"
        disabled={pensando}
        className="button-primary self-start py-2 text-sm"
      >
        {pensando ? "Pensando…" : "Seguir"}
      </button>
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <p className="text-xs text-muted">
        Lo que escribes aquí se envía a la IA solo para elegir el motivo. No se
        guarda.
      </p>
    </form>
  );
}

// «Explícamelo con IA»: la IA te cuenta con palabras la propuesta de la app.
export function ExplicarDiaConIA({ motivo }: { motivo: Motivo }) {
  const [estado, pedir, pensando] = useActionState<ExplicarDiaState, FormData>(
    explicarDiaConIA,
    {},
  );
  return (
    <div className="flex flex-col gap-2">
      {estado.texto && (
        <p className="card whitespace-pre-wrap text-sm">{estado.texto}</p>
      )}
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      <form action={pedir}>
        <input type="hidden" name="motivo" value={motivo} />
        <button
          type="submit"
          disabled={pensando}
          className="text-sm underline disabled:opacity-60"
        >
          {pensando
            ? "Pensando…"
            : estado.texto
              ? "Explícamelo otra vez"
              : "Explícamelo con IA"}
        </button>
      </form>
      {estado.texto && (
        <p className="text-xs text-muted">
          Texto escrito por una IA: puede equivocarse. Lo que se conserva, se
          reduce o se aplaza lo calcula la app.
        </p>
      )}
    </div>
  );
}
