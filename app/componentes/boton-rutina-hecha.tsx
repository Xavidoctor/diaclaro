"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { marcarRutinaHecha } from "@/app/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";
import { fechaLocal } from "@/lib/planner/cambios-sin-conexion";

// Botón «Hecho» de una rutina (en Hoy y en «Lo primero»). Sin internet se
// apunta en el móvil y se envía al volver la red.
export function BotonRutinaHecha({
  id,
  titulo,
  vez = null,
}: {
  id: string;
  titulo: string;
  vez?: number | null; // qué vez del día, si se hace varias veces
}) {
  const [esperando, setEsperando] = useState(false);

  async function marcar(formData: FormData) {
    const r = await intentarOGuardar(() => marcarRutinaHecha(formData), {
      tipo: "rutina-hecha",
      rutinaId: id,
      titulo,
      vez,
      dia: fechaLocal(new Date()),
    });
    if (r === "guardado") setEsperando(true);
  }

  if (esperando) {
    return (
      <span
        role="status"
        title="Se enviará al volver internet"
        className="flex items-center gap-1 py-2 text-sm font-medium text-primary"
      >
        <Check aria-hidden className="size-4" />
        Hecho
      </span>
    );
  }

  return (
    <form action={marcar}>
      <input type="hidden" name="id" value={id} />
      {vez && <input type="hidden" name="vez" value={vez} />}
      <button type="submit" className="button-primary py-2 text-sm">
        Hecho
      </button>
    </form>
  );
}
