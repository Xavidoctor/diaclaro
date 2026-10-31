"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { deshacerRutinaHecha, marcarRutinaHecha } from "@/app/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";
import { fechaLocal } from "@/lib/planner/cambios-sin-conexion";

// La casilla de una rutina de hoy (en «Por hacer» y en la Agenda).
// Un toque la marca como hecha y se queda tachada; otro toque la desmarca,
// por si la pulsaste sin querer. Sin internet, marcarla se guarda en el
// móvil y se envía al volver la red (desmarcar necesita internet).
export function CasillaRutina({
  id,
  titulo,
  vez,
  hecha,
  alCambiar,
}: {
  id: string;
  titulo: string;
  vez: number | null; // qué vez del día, si se hace varias veces
  hecha: boolean;
  alCambiar?: (hecha: boolean) => void;
}) {
  // Lo que se ve mientras se guarda (o mientras espera a tener internet).
  const [marcada, setMarcada] = useState(hecha);
  const [guardando, setGuardando] = useState(false);

  async function cambiar() {
    if (guardando) return;
    const nueva = !marcada;
    const datos = new FormData();
    datos.set("id", id);
    if (vez) datos.set("vez", String(vez));
    setMarcada(nueva);
    alCambiar?.(nueva);
    setGuardando(true);
    try {
      if (nueva)
        await intentarOGuardar(() => marcarRutinaHecha(datos), {
          tipo: "rutina-hecha",
          rutinaId: id,
          titulo,
          vez,
          dia: fechaLocal(new Date()),
        });
      else await deshacerRutinaHecha(datos);
    } catch {
      // No se ha podido: vuelve a como estaba.
      setMarcada(!nueva);
      alCambiar?.(!nueva);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-pressed={marcada}
      aria-label={
        marcada ? `Desmarcar «${titulo}»` : `Marcar «${titulo}» como hecha`
      }
      className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
        marcada
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border"
      } ${guardando ? "opacity-60" : ""}`}
    >
      {marcada && <Check aria-hidden className="size-4" />}
    </button>
  );
}
