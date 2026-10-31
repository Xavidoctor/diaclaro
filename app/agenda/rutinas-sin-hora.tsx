"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { moverEnElDia } from "@/app/agenda/acciones-mover";
import { CasillaRutina } from "@/app/componentes/casilla-rutina";
import { textoDuracion } from "@/lib/planner/carga";

// Las rutinas de ese día que no tienen hora (como «Deporte · 60 min»).
// La app no les pone hora: con «Elegir hora» te sugiere los ratos libres
// donde caben, o escribes otra. Al elegir, pasa al día por horas (solo ese día).
export type RutinaSinHoraVista = {
  id: string;
  titulo: string;
  vez: number;
  minutos: number | null;
  hecha: boolean;
  sugerencias: string[]; // "10:00", "19:30"...
};

export function RutinasSinHora({
  rutinas,
  fecha,
  esHoy,
  sePuedeOrdenar,
}: {
  rutinas: RutinaSinHoraVista[];
  fecha: string;
  esHoy: boolean;
  sePuedeOrdenar: boolean; // en días pasados ya no se elige hora
}) {
  return (
    <ul aria-label="Rutinas sin hora" className="flex flex-col gap-2">
      {rutinas.map((r) => (
        <FilaSinHora
          key={`${r.id}|${r.vez}`}
          r={r}
          fecha={fecha}
          esHoy={esHoy}
          sePuedeOrdenar={sePuedeOrdenar}
        />
      ))}
    </ul>
  );
}

function FilaSinHora({
  r,
  fecha,
  esHoy,
  sePuedeOrdenar,
}: {
  r: RutinaSinHoraVista;
  fecha: string;
  esHoy: boolean;
  sePuedeOrdenar: boolean;
}) {
  const [hecha, setHecha] = useState(r.hecha);
  const [eligiendo, setEligiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function poner(hora: string) {
    setGuardando(true);
    setError(null);
    const res = await moverEnElDia({
      tipo: "rutina",
      id: r.id,
      fecha,
      vez: r.vez,
      hora,
    });
    setGuardando(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <li className="card flex flex-col gap-2 p-3 text-sm">
      <div className="flex items-start gap-3">
        {esHoy && (
          <CasillaRutina
            id={r.id}
            titulo={r.titulo}
            vez={r.vez}
            hecha={r.hecha}
            alCambiar={setHecha}
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={`break-words font-medium ${hecha ? "text-muted line-through" : ""}`}
          >
            {r.titulo}
          </span>
          <span className="text-xs text-muted">
            {r.minutos ? `${textoDuracion(r.minutos)} · ` : ""}sin hora
          </span>
        </span>
        {sePuedeOrdenar && !hecha && !eligiendo && (
          <button
            type="button"
            onClick={() => setEligiendo(true)}
            className="enlace inline-flex shrink-0 items-center gap-1"
          >
            <Clock aria-hidden className="size-4" />
            Elegir hora
          </button>
        )}
      </div>

      {eligiendo && (
        <div className="flex flex-col gap-2">
          {r.sugerencias.length > 0 ? (
            <>
              <p className="text-xs text-muted">
                Ratos libres donde cabe
                {r.minutos ? "" : " (no tiene duración)"}:
              </p>
              <div className="flex flex-wrap gap-2">
                {r.sugerencias.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={guardando}
                    onClick={() => poner(h)}
                    className="rounded-full bg-secondary px-4 py-2 font-medium"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">
              No veo un rato libre donde quepa. Escribe tú la hora.
            </p>
          )}
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const hora = new FormData(e.currentTarget).get("hora");
              if (typeof hora === "string" && hora) poner(hora.slice(0, 5));
            }}
          >
            <label className="flex flex-col gap-1">
              Otra hora
              <input
                name="hora"
                type="time"
                step={300}
                required
                className="input py-2"
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="button-primary py-2 text-sm"
            >
              Poner
            </button>
            <button
              type="button"
              onClick={() => setEligiendo(false)}
              className="py-2 text-muted underline"
            >
              Cancelar
            </button>
          </form>
          <p className="text-xs text-muted">
            Solo cambia este día. Si siempre la haces a la misma hora, pónsela
            en la rutina.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
