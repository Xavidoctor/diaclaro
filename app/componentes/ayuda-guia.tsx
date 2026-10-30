"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CircleHelp, X } from "lucide-react";
import { SECCIONES_GUIA } from "@/lib/planner/guia";

// ---- Si la ayuda pequeña está oculta, se guarda en este navegador ----
// No hace falta base de datos: es solo una preferencia de esta pantalla.
// (Si el navegador no deja guardar, se recuerda mientras no recargues).

const CLAVE = "diaclaro.guia-oculta";
const oyentes = new Set<() => void>();
let enMemoria = false;

function leerOculta(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "si";
  } catch {
    return enMemoria;
  }
}

function guardarOculta(oculta: boolean) {
  enMemoria = oculta;
  try {
    if (oculta) localStorage.setItem(CLAVE, "si");
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: nos quedamos con la copia en memoria.
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribirse(avisar: () => void) {
  oyentes.add(avisar);
  // "storage" llega si la cambias en otra pestaña.
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

// En el servidor no sabemos qué elegiste, así que la damos por oculta:
// así no aparece y desaparece de golpe a quien ya la quitó.
function useAyudaOculta() {
  return useSyncExternalStore(suscribirse, leerOculta, () => true);
}

// El apartado pequeño de arriba de cada pantalla: «¿Cómo se usa esto?».
// "seccion" es el id de la parte de la guía que explica esta pantalla.
export function AyudaPantalla({ seccion }: { seccion: string }) {
  const oculta = useAyudaOculta();
  const parte = SECCIONES_GUIA.find((s) => s.id === seccion);
  if (oculta || !parte) return null;

  return (
    <aside className="flex items-center gap-2 rounded-2xl bg-secondary py-1 pl-4 pr-1 text-sm">
      <CircleHelp aria-hidden className="size-4 shrink-0 text-primary" />
      <p className="flex-1">
        ¿Algo no se entiende?{" "}
        <Link href={`/guia#${parte.id}`} className="enlace">
          Cómo se usa
        </Link>
      </p>
      <button
        type="button"
        onClick={() => guardarOculta(true)}
        aria-label="Ocultar la ayuda (puedes volver a mostrarla en Ajustes)"
        title="Ocultar la ayuda"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface"
      >
        <X aria-hidden className="size-4" />
      </button>
    </aside>
  );
}

// Para Ajustes y la guía: el botón que la oculta o la vuelve a mostrar.
export function InterruptorAyuda() {
  const oculta = useAyudaOculta();
  return (
    <button
      type="button"
      onClick={() => guardarOculta(!oculta)}
      className="button-secondary"
    >
      {oculta ? "Volver a mostrar la ayuda" : "Ocultar la ayuda"}
    </button>
  );
}
