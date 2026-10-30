"use client";

import { useActionState } from "react";
import {
  aplicarCambio,
  interpretarCambio,
  type AplicarState,
  type CambioState,
  type PropuestaCambio,
} from "@/app/cambio/actions";
import { SaberMas } from "@/app/componentes/saber-mas";

// Paso 1: cuentas qué ha cambiado. Paso 2: aceptas los cambios que quieras.
export function AlgoHaCambiado() {
  const [estado, pedir, pensando] = useActionState<CambioState, FormData>(
    interpretarCambio,
    { intento: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={pedir} className="flex flex-col gap-2">
        <label htmlFor="texto-cambio" className="font-medium">
          ¿Qué ha cambiado?
        </label>
        <textarea
          id="texto-cambio"
          name="texto"
          rows={3}
          required
          maxLength={1000}
          defaultValue={estado.texto ?? ""}
          placeholder="Por ejemplo: me han cancelado la tutoría del martes y la entrega de la práctica pasa al viernes"
          className="input resize-y"
        />
        <button
          type="submit"
          disabled={pensando}
          className="button-primary self-start"
        >
          {pensando ? "Pensando…" : "Proponer cambios"}
        </button>
        {estado.error && (
          <p role="alert" className="text-sm text-danger">
            {estado.error}
          </p>
        )}
      </form>

      {estado.cambios && (
        <section key={estado.intento} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Cambios propuestos</h2>
          <SaberMas resumen="Los ha propuesto una IA y puede equivocarse.">
            Nada cambia hasta que pulses «Aceptar» en cada uno.
          </SaberMas>
          <ul className="flex flex-col gap-2">
            {estado.cambios.map((c) => (
              <FilaCambio key={c.valor} cambio={c} />
            ))}
          </ul>
          {estado.descartados ? (
            <p className="text-xs text-muted">
              He quitado{" "}
              {estado.descartados === 1
                ? "1 propuesta"
                : `${estado.descartados} propuestas`}{" "}
              con días u horas que no estaban en lo que escribiste, o con cosas
              que no tienes apuntadas.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

function FilaCambio({ cambio }: { cambio: PropuestaCambio }) {
  const [estado, aceptar, guardando] = useActionState<AplicarState, FormData>(
    aplicarCambio,
    {},
  );
  return (
    <li className="card flex items-center gap-3 p-4 text-sm">
      <span className="flex-1 break-words">{cambio.texto}</span>
      {estado.hecho ? (
        <span role="status" className="text-muted">
          Hecho
        </span>
      ) : (
        <form action={aceptar}>
          <input type="hidden" name="cambio" value={cambio.valor} />
          <button type="submit" disabled={guardando} className="underline">
            {guardando ? "Guardando…" : "Aceptar"}
          </button>
        </form>
      )}
      {estado.error && (
        <span role="alert" className="text-danger">
          {estado.error}
        </span>
      )}
    </li>
  );
}
