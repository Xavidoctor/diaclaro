"use client";

import { useActionState } from "react";
import {
  borrarFrase,
  guardarFrase,
  pedirIdeasDeFrases,
  type FraseState,
  type IdeasState,
} from "@/app/habitos/actions";
import { MAX_FRASES, MAX_LARGO_FRASE } from "@/lib/planner/habitos";

// Tus frases para motivarte con este hábito: escribirlas, quitarlas y,
// si quieres, pedir ideas a la IA y guardar solo las que te gusten.
export function Frases({
  id,
  frases,
  conIA,
}: {
  id: string;
  frases: string[];
  conIA: boolean;
}) {
  const [estado, guardar, guardando] = useActionState<FraseState, FormData>(
    guardarFrase,
    { envios: 0 },
  );
  const [ideas, pedir, pensando] = useActionState<IdeasState, FormData>(
    pedirIdeasDeFrases,
    {},
  );
  // Las ideas que ya has guardado dejan de salir en la lista de ideas.
  const pendientes = (ideas.ideas ?? []).filter((f) => !frases.includes(f));

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <h2 className="text-lg font-semibold">Tus frases</h2>
      <p className="text-sm text-muted">
        Frases para animarte. Cuando te llegue un aviso de este hábito, sale una
        de ellas. Como mucho {MAX_FRASES}.
      </p>

      {frases.length > 0 && (
        <ul className="flex flex-col gap-2">
          {frases.map((f) => (
            <li key={f} className="card flex items-start gap-3 p-3 text-sm">
              <span className="flex-1 break-words">{f}</span>
              <form action={borrarFrase}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="frase" value={f} />
                <button type="submit" className="text-muted underline">
                  Quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* key: vacía el campo después de guardar */}
      <form
        key={estado.envios}
        action={guardar}
        className="flex flex-col gap-2 text-sm"
      >
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-1">
          Escribe una frase
          <input
            name="frase"
            maxLength={MAX_LARGO_FRASE}
            placeholder="Por ejemplo: Un paso pequeño también cuenta"
            className="input py-2"
          />
        </label>
        <button
          type="submit"
          disabled={guardando}
          className="button-primary py-2 text-sm"
        >
          {guardando ? "Guardando…" : "Guardar frase"}
        </button>
      </form>

      {conIA && (
        <div className="flex flex-col gap-2 text-sm">
          <form action={pedir}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={pensando}
              className="underline disabled:opacity-60"
            >
              {pensando ? "Pensando…" : "Pedir ideas a la IA"}
            </button>
          </form>
          <p className="text-muted">
            A la IA solo le llega el nombre de este hábito y lo que quieres
            (hacerlo más, menos o verlo). Nunca lo que apuntas.
          </p>
          {pendientes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {pendientes.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-xl border border-border p-3"
                >
                  <span className="flex-1 break-words">{f}</span>
                  <form action={guardar}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="frase" value={f} />
                    <button
                      type="submit"
                      disabled={guardando}
                      className="underline"
                    >
                      Guardar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {ideas.error && (
            <p role="alert" className="text-danger">
              {ideas.error}
            </p>
          )}
        </div>
      )}

      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
    </section>
  );
}
