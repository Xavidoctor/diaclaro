"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { apuntar, type ApunteState } from "@/app/habitos/actions";
import { intentarOGuardar } from "@/app/componentes/cambios-sin-conexion";
import { fechaLocal } from "@/lib/planner/cambios-sin-conexion";

// «sinRed»: se ha guardado en el móvil y se enviará al volver internet.
type Estado = ApunteState & { sinRed?: boolean };

async function apuntarOGuardar(prev: Estado, formData: FormData): Promise<Estado> {
  let resultado: ApunteState = prev;
  const r = await intentarOGuardar(
    async () => {
      resultado = await apuntar(prev, formData);
    },
    {
      tipo: "apunte-habito",
      habitoId: String(formData.get("id") ?? ""),
      dia: fechaLocal(new Date()),
      cantidad: String(formData.get("amount") ?? ""),
      nota: String(formData.get("note") ?? ""),
    },
  );
  return r === "guardado" ? { envios: prev.envios + 1, sinRed: true } : resultado;
}

// Botón «+1» y, desplegando, otra cantidad con una nota opcional.
// Si el hábito no tiene unidad, el botón es «Hecho» (y, ya hecho, solo
// sale la marca). Se usa en la pantalla de Hábitos y en Hoy.
export function Apuntar({
  id,
  unidad,
  conDetalle = true,
  ninguno = false,
  hecho = false,
}: {
  id: string;
  unidad: string | null;
  conDetalle?: boolean;
  // Botón «Hoy, ninguno» (apunta 0), para hábitos que quieres hacer menos.
  ninguno?: boolean;
  // Hoy ya apuntaste algo (para mostrar «Hecho» en los hábitos sin unidad).
  hecho?: boolean;
}) {
  const [estado, formAction, guardando] = useActionState<Estado, FormData>(
    apuntarOGuardar,
    { envios: 0 },
  );

  const deMarcar = !unidad;
  if (deMarcar && (hecho || estado.sinRed)) {
    return (
      <span className="flex items-center gap-1 py-2 text-sm font-medium text-primary">
        <Check aria-hidden className="size-4" />
        Hecho
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex justify-end gap-2">
        <input type="hidden" name="id" value={id} />
        {ninguno && (
          <button
            type="submit"
            name="amount"
            value="0"
            disabled={guardando}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            Hoy, ninguno
          </button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="button-primary py-2 text-sm"
          aria-label={deMarcar ? "Marcar como hecho" : `Apuntar 1 ${unidad}`}
        >
          {deMarcar ? "Hecho" : "+1"}
        </button>
      </form>
      {conDetalle && !deMarcar && (
        <details className="text-sm">
          <summary className="cursor-pointer text-right text-muted underline">
            Otra cantidad
          </summary>
          {/* key: vacía el formulario después de apuntar */}
          <form
            key={estado.envios}
            action={formAction}
            className="mt-2 flex flex-col gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <label className="flex flex-col gap-1">
              ¿Cuánto?{unidad ? ` (${unidad})` : ""}
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                placeholder="1"
                className="input py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              Nota (opcional)
              <input
                name="note"
                maxLength={500}
                placeholder="Qué estabas haciendo, cómo te sentías…"
                className="input py-2"
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="button-primary py-2 text-sm"
            >
              Apuntar
            </button>
          </form>
        </details>
      )}
      {estado.error && (
        <p role="alert" className="text-sm text-danger">
          {estado.error}
        </p>
      )}
      {estado.sinRed && (
        <p role="status" className="text-right text-xs text-muted">
          Apuntado en el móvil. Se enviará al volver internet.
        </p>
      )}
    </div>
  );
}
