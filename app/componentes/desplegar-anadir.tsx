"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

// Un solo botón «Añadir…». Al pulsarlo se despliega el formulario; así la
// pantalla se ve limpia hasta que de verdad quieres apuntar algo.
export function DesplegarAnadir({
  texto,
  children,
}: {
  texto: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={false}
        className="button-secondary gap-1 self-start text-sm"
      >
        <Plus aria-hidden className="size-4" />
        {texto}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{texto}</p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar"
          aria-expanded
          className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-secondary"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      {children}
    </div>
  );
}
