"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { marcarTarea } from "@/app/bandeja/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";
import {
  leerMinutosReales,
  opcionesMinutosReales,
} from "@/lib/planner/tiempos";

// La casilla para marcar una tarea como hecha. Antes de guardarla pregunta
// "¿cuánto has tardado?": con eso la app aprende tus tiempos reales.
// Siempre se puede contestar "No lo sé": entonces no se guarda ningún tiempo.
// Sin internet se guarda en el móvil y se envía al volver la red.
export function CasillaHecha({
  id,
  titulo,
  previstos,
  alMarcar,
}: {
  id: string;
  titulo: string;
  previstos: number | null;
  alMarcar?: () => void; // por ejemplo, para quitarla de una lista
}) {
  const [abierta, setAbierta] = useState(false);
  const [esperando, setEsperando] = useState(false);

  async function marcar(formData: FormData) {
    const minutos = formData.get("minutos");
    const r = await intentarOGuardar(() => marcarTarea(formData), {
      tipo: "tarea-hecha",
      tareaId: id,
      titulo,
      minutos: leerMinutosReales(
        minutos === "otros" ? formData.get("otros") : minutos,
      ),
    });
    setAbierta(false);
    if (r === "guardado") setEsperando(true);
    alMarcar?.();
  }

  // Marcada sin internet: se ve hecha mientras espera a enviarse.
  if (esperando) {
    return (
      <span
        title="Se enviará al volver internet"
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <Check aria-hidden className="size-4" />
        <span className="sr-only">Hecha (se enviará al volver internet)</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Marcar como hecha"
        onClick={() => setAbierta(true)}
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 border-border"
      />

      {abierta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setAbierta(false)}
        >
          <form
            action={marcar}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-xl flex-col gap-4 rounded-t-2xl bg-background p-6"
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="hecha" value="si" />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">¿Cuánto has tardado?</p>
              <p className="break-words text-sm text-muted">{titulo}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {opcionesMinutosReales(previstos).map((m) => (
                <button
                  key={m}
                  type="submit"
                  name="minutos"
                  value={m}
                  className="card py-3 text-center"
                >
                  {m} min
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Otro (minutos)
                <input
                  name="otros"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  className="input py-2"
                />
              </label>
              <button
                type="submit"
                name="minutos"
                value="otros"
                className="button-primary py-2"
              >
                Guardar
              </button>
            </div>

            <div className="flex justify-between text-sm">
              <button
                type="submit"
                name="minutos"
                value=""
                className="underline"
              >
                No lo sé, solo marcarla
              </button>
              <button
                type="button"
                onClick={() => setAbierta(false)}
                className="text-muted underline"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
