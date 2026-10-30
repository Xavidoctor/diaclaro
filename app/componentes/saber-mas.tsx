"use client";

import { useId, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

// Explicación escondida detrás de una «i».
// Se ve una frase corta (resumen) y, al final, una «i» más oscura.
// Al tocarla se abre la explicación larga justo debajo; se cierra
// tocando otra vez la «i» o la X.
// Si no hay resumen, se ve solo la «i» con el texto «Saber más».
export function SaberMas({
  resumen,
  children,
  className = "",
}: {
  resumen?: ReactNode; // frase corta que siempre se ve
  children: ReactNode; // la explicación larga
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();

  const boton = (
    <button
      type="button"
      onClick={() => setAbierta((a) => !a)}
      aria-expanded={abierta}
      aria-controls={id}
      aria-label={abierta ? "Ocultar explicación" : "Saber más"}
      className="ml-1 inline-flex translate-y-[3px] items-center gap-1 rounded-full align-baseline text-foreground transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Info className="size-[18px]" strokeWidth={2.25} aria-hidden />
      {!resumen && <span className="text-sm font-medium">Saber más</span>}
    </button>
  );

  return (
    <div className={`text-sm ${className}`}>
      <p className="text-muted">
        {resumen}
        {boton}
      </p>
      {abierta && (
        <div
          id={id}
          className="mt-2 flex items-start gap-2 rounded-xl bg-secondary px-3 py-2 text-foreground"
        >
          <div className="flex flex-1 flex-col gap-2">{children}</div>
          <button
            type="button"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar explicación"
            className="-mr-1 shrink-0 rounded-full p-1 text-muted active:opacity-70"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
