"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { NuevaTareaDia } from "@/app/agenda/nueva-tarea-dia";
import { CasillaHecha } from "@/app/bandeja/casilla-hecha";
import { marcarTarea } from "@/app/bandeja/actions";
import { CasillaRutina } from "@/app/componentes/casilla-rutina";
import {
  contarPendientes,
  textoContador,
  type Pendiente,
} from "@/lib/planner/pendientes-hoy";

// Cuántas se ven sin desplegar: el resto, en «Ver N más».
const A_LA_VISTA = 8;

// El resumen de «Tu plan de hoy»: lo que te queda hoy para ir tachando,
// con el contador «1/2 pendientes» y el botón «Añadir tarea».
// Lo que marcas se tacha al momento y el contador baja; si lo marcaste sin
// querer, vuelve a tocar la casilla para desmarcarlo.
export function PendientesDeHoy({
  lista,
  hoy,
}: {
  lista: Pendiente[];
  hoy: string;
}) {
  // Lo que has marcado o desmarcado aquí (lo demás, como venía).
  const [cambiadas, setCambiadas] = useState<Record<string, boolean>>({});
  const [anadiendo, setAnadiendo] = useState(false);
  const cambiar = (clave: string, hecha: boolean) =>
    setCambiadas((c) => ({ ...c, [clave]: hecha }));

  const filas = lista.map((p) => ({ ...p, hecha: cambiadas[p.clave] ?? p.hecha }));
  const { quedan, total } = contarPendientes(filas);
  const aLaVista = filas.slice(0, A_LA_VISTA);
  const plegadas = filas.slice(A_LA_VISTA);

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Pendientes</h3>
        <span
          role="status"
          className={`text-sm font-semibold ${quedan === 0 && total > 0 ? "text-primary" : ""}`}
        >
          {textoContador(quedan, total)}
        </span>
      </div>

      {total > 0 && (
        // La barra se llena según lo que vas haciendo.
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((total - quedan) / total) * 100}%` }}
          />
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-muted">
          No tienes nada pendiente hoy. Si quieres, añade una tarea.
        </p>
      )}

      {aLaVista.length > 0 && (
        <ul className="flex flex-col gap-2">
          {aLaVista.map((p) => (
            <Fila key={p.clave} p={p} alCambiar={(h) => cambiar(p.clave, h)} />
          ))}
        </ul>
      )}
      {plegadas.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer text-sm text-muted">
            Ver {plegadas.length === 1 ? "1 más" : `${plegadas.length} más`}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {plegadas.map((p) => (
              <Fila
                key={p.clave}
                p={p}
                alCambiar={(h) => cambiar(p.clave, h)}
              />
            ))}
          </ul>
        </details>
      )}

      {anadiendo ? (
        <div className="flex flex-col gap-2">
          <NuevaTareaDia dia={hoy} titulo="Nueva tarea para hoy" />
          <button
            type="button"
            onClick={() => setAnadiendo(false)}
            className="flex items-center gap-1 self-start text-sm text-muted underline"
          >
            <X aria-hidden className="size-4" />
            Cerrar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAnadiendo(true)}
          className="button-primary flex items-center justify-center gap-2 py-2 text-sm"
        >
          <Plus aria-hidden className="size-4" />
          Añadir tarea
        </button>
      )}
    </div>
  );
}

// Una fila: casilla, título (tachado si está hecha) y una línea pequeña.
function Fila({
  p,
  alCambiar,
}: {
  p: Pendiente;
  alCambiar: (hecha: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="mt-0.5">
        {p.tipo === "rutina" ? (
          <CasillaRutina
            id={p.id}
            titulo={p.titulo}
            vez={p.vez}
            hecha={p.hecha}
            alCambiar={alCambiar}
          />
        ) : p.hecha ? (
          <DesmarcarTarea p={p} alCambiar={alCambiar} />
        ) : (
          <CasillaHecha
            id={p.id}
            titulo={p.titulo}
            previstos={p.previstos}
            alMarcar={() => alCambiar(true)}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`break-words ${p.hecha ? "text-muted line-through" : ""}`}
        >
          {p.titulo}
        </span>
        <span className="text-xs text-muted">{p.detalle}</span>
      </span>
    </li>
  );
}

// Una tarea ya hecha: un toque la desmarca (por si fue sin querer).
// Desmarcar necesita internet.
function DesmarcarTarea({
  p,
  alCambiar,
}: {
  p: Pendiente;
  alCambiar: (hecha: boolean) => void;
}) {
  const [guardando, setGuardando] = useState(false);

  async function desmarcar() {
    if (guardando) return;
    const datos = new FormData();
    datos.set("id", p.id);
    datos.set("hecha", "no");
    alCambiar(false);
    setGuardando(true);
    try {
      await marcarTarea(datos);
    } catch {
      alCambiar(true); // no se ha podido: vuelve a como estaba
    } finally {
      setGuardando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={desmarcar}
      aria-pressed
      aria-label={`Desmarcar «${p.titulo}»`}
      className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground ${guardando ? "opacity-60" : ""}`}
    >
      <Check aria-hidden className="size-4" />
    </button>
  );
}
