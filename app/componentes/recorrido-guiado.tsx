"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  PASOS,
  avanzar,
  empiezaSolo,
  leerEstado,
  lugarTarjeta,
  retroceder,
  textoEstado,
  trasNavegar,
  type EstadoRecorrido,
} from "@/lib/planner/recorrido";

// ---- Por qué paso vas se guarda en este navegador ----
// Así el recorrido sigue aunque cambies de pantalla o recargues.

const CLAVE = "diaclaro.recorrido";
const oyentes = new Set<() => void>();
let enMemoria: string | null = null;

function leerTexto(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return enMemoria;
  }
}

function guardar(estado: EstadoRecorrido) {
  enMemoria = textoEstado(estado);
  try {
    if (enMemoria === null) localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, enMemoria);
  } catch {
    // Sin almacenamiento: nos quedamos con la copia en memoria.
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

// En el servidor no sabemos nada: lo damos por hecho y no se pinta.
function useEstado(): EstadoRecorrido {
  const texto = useSyncExternalStore(suscribirse, leerTexto, () => "hecho");
  return leerEstado(texto);
}

// Pantallas donde nunca sale (aún no has entrado en la app).
const SIN_RECORRIDO = ["/login", "/auth"];

type Caja = { top: number; left: number; width: number; height: number };

// El recorrido: oscurece la pantalla, ilumina dónde tocar y explica cada paso.
// Va en el layout, así que está en todas las pantallas.
export function RecorridoGuiado() {
  const ruta = usePathname();
  const router = useRouter();
  const estado = useEstado();
  const fuera = SIN_RECORRIDO.some((r) => ruta.startsWith(r));

  // La primera vez que entras en Hoy, empieza solo.
  useEffect(() => {
    if (!fuera && empiezaSolo(estado, ruta))
      guardar({ tipo: "activo", paso: 0 });
  }, [estado, ruta, fuera]);

  // Si has tocado el enlace que pedía el paso, pasa al siguiente.
  useEffect(() => {
    const nuevo = trasNavegar(estado, ruta);
    if (nuevo !== estado) guardar(nuevo);
  }, [estado, ruta]);

  if (fuera || estado.tipo !== "activo") return null;
  const paso = PASOS[estado.paso];

  // Estás en otra pantalla: te ofrece volver a donde iba el recorrido.
  if (paso.ruta !== ruta) {
    return (
      <Tarjeta lugar="abajo">
        <p className="text-sm">
          El recorrido sigue en otra pantalla. ¿Quieres continuar?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(paso.ruta)}
            className="button-primary py-2 text-sm"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={() => guardar({ tipo: "hecho" })}
            className="button-secondary py-2 text-sm"
          >
            Terminar
          </button>
        </div>
      </Tarjeta>
    );
  }

  // "key": al cambiar de paso, el foco empieza de cero.
  return <PasoEnPantalla key={estado.paso} numero={estado.paso} />;
}

function PasoEnPantalla({ numero }: { numero: number }) {
  const router = useRouter();
  const paso = PASOS[numero];
  const caja = useCajaDe(paso.objetivo);
  const [altoPantalla, setAltoPantalla] = useState(800);
  useEffect(() => {
    const medir = () => setAltoPantalla(window.innerHeight);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const lugar = lugarTarjeta(
    caja ? caja.top + caja.height / 2 : null,
    altoPantalla,
  );
  const ultimo = numero === PASOS.length - 1;
  const estado: EstadoRecorrido = { tipo: "activo", paso: numero };

  function siguiente() {
    // Si el paso pide ir a otra pantalla, «Siguiente» te lleva allí.
    if (paso.ir) router.push(paso.ir);
    else guardar(avanzar(estado));
  }

  return (
    <>
      {/* El foco: un hueco con una sombra enorme alrededor que oscurece el resto.
          pointer-events-none: puedes tocar lo iluminado a través de él. */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-40 rounded-2xl transition-all duration-300"
        style={
          caja
            ? {
                top: caja.top - 6,
                left: caja.left - 6,
                width: caja.width + 12,
                height: caja.height + 12,
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
                outline: "3px solid var(--primary)",
              }
            : { inset: 0, background: "rgb(0 0 0 / 0.55)" }
        }
      />
      <Tarjeta lugar={lugar}>
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs font-semibold text-muted">
              Paso {numero + 1} de {PASOS.length}
            </p>
            <h2 className="text-lg font-semibold">{paso.titulo}</h2>
          </div>
          <button
            type="button"
            onClick={() => guardar({ tipo: "hecho" })}
            aria-label="Saltar el recorrido"
            className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-secondary"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="text-sm">{paso.texto}</p>
        <div className="flex items-center gap-2">
          {numero > 0 && (
            <button
              type="button"
              onClick={() => guardar(retroceder(estado))}
              className="button-secondary py-2 text-sm"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={() => guardar({ tipo: "hecho" })}
            className="ml-auto text-sm text-muted underline"
          >
            Saltar
          </button>
          <button
            type="button"
            onClick={ultimo ? () => guardar({ tipo: "hecho" }) : siguiente}
            className="button-primary py-2 text-sm"
          >
            {ultimo ? "Terminar" : numero === 0 ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </Tarjeta>
    </>
  );
}

// La tarjeta con la explicación, arriba, abajo o en el centro de la pantalla.
function Tarjeta({
  lugar,
  children,
}: {
  lugar: "arriba" | "abajo" | "centro";
  children: React.ReactNode;
}) {
  const posicion =
    lugar === "arriba"
      ? "top-4"
      : lugar === "abajo"
        ? "bottom-20"
        : "top-1/2 -translate-y-1/2";
  return (
    <div
      role="dialog"
      aria-label="Recorrido por la app"
      className={`fixed inset-x-4 z-50 mx-auto max-w-md ${posicion}`}
    >
      <div className="card flex flex-col gap-3 shadow-lg">{children}</div>
    </div>
  );
}

// Busca el elemento con data-guia="…", lo pone a la vista y sigue su posición.
// Si no aparece (por ejemplo, porque esa parte está oculta hoy), da null y
// la tarjeta sale en el centro.
function useCajaDe(objetivo: string | null): Caja | null {
  const [caja, setCaja] = useState<Caja | null>(null);
  useEffect(() => {
    if (!objetivo) return;
    let centrado = false;
    function medir() {
      const el = document.querySelector(`[data-guia="${objetivo}"]`);
      if (!el) return setCaja(null);
      if (!centrado) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        centrado = true;
      }
      const r = el.getBoundingClientRect();
      setCaja((antes) =>
        antes &&
        antes.top === r.top &&
        antes.left === r.left &&
        antes.width === r.width &&
        antes.height === r.height
          ? antes
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    }
    // Se mide a menudo: la pantalla puede moverse (scroll, carga, teclado).
    const id = window.setInterval(medir, 200);
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, [objetivo]);
  return objetivo ? caja : null;
}

// Botón para hacer el recorrido otra vez (en Ajustes y en la guía).
export function BotonRecorrido({
  className = "button-primary",
  texto = "Hacer el recorrido",
}: {
  className?: string;
  texto?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        guardar({ tipo: "activo", paso: 0 });
        router.push("/");
      }}
      className={className}
    >
      {texto}
    </button>
  );
}
