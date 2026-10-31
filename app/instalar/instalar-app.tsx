"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download } from "lucide-react";
import {
  hayAvisoInstalar,
  pedirInstalar,
  suscribirAvisoInstalar,
} from "@/app/instalar/aviso-instalar";
import { detectarAparato, guiasEnOrden, type Aparato } from "@/lib/planner/instalar";

const sinCambios = () => () => {};

// ¿Ya estás dentro de la app instalada (sin la barra del navegador)?
function estaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function aparatoActual(): Aparato {
  return detectarAparato(navigator.userAgent, navigator.maxTouchPoints);
}

// El botón «Instalar» (si el navegador lo permite) y los pasos de cada aparato.
// En el servidor no sabemos qué aparato usas: enseñamos el orden de siempre.
export function InstalarApp() {
  const aparato = useSyncExternalStore<Aparato | null>(
    sinCambios,
    aparatoActual,
    () => null,
  );
  const instalada = useSyncExternalStore(sinCambios, estaInstalada, () => false);
  const puedeInstalar = useSyncExternalStore(
    suscribirAvisoInstalar,
    hayAvisoInstalar,
    () => false,
  );
  const [aceptada, setAceptada] = useState(false);

  if (instalada) {
    return (
      <section className="card flex items-start gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Ya estás usando la app instalada.</p>
          <p className="text-sm text-muted">
            Para tenerla en otro aparato, abre diaclaro.vercel.app allí y sigue
            los pasos de abajo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      {aceptada ? (
        <section className="card flex items-start gap-3">
          <CheckCircle2 aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
          <p className="font-semibold">
            ¡Hecho! Busca el icono de DíaClaro en tu pantalla de inicio o en tus
            aplicaciones.
          </p>
        </section>
      ) : (
        puedeInstalar && (
          <button
            type="button"
            onClick={async () => setAceptada(await pedirInstalar())}
            className="button-primary gap-2"
          >
            <Download aria-hidden className="size-5" />
            Instalar DíaClaro
          </button>
        )
      )}

      <ul className="flex flex-col gap-2">
        {guiasEnOrden(aparato ?? "android").map((g) => (
          <li key={g.aparato}>
            {/* Se abre sola la guía del aparato que estás usando. */}
            <details className="card group p-0" open={g.aparato === aparato}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold">
                <span className="flex-1">{g.titulo}</span>
                {g.aparato === aparato && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">
                    El que usas ahora
                  </span>
                )}
              </summary>
              <div className="flex flex-col gap-3 px-5 pb-5">
                <ol className="ml-5 flex list-decimal flex-col gap-2">
                  {g.pasos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
                {g.nota && <p className="text-sm text-muted">{g.nota}</p>}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
