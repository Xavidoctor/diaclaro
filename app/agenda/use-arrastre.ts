"use client";

import { useEffect, useRef, useState } from "react";
import { MS_PULSACION } from "@/lib/planner/mover-dia";

// (Se llama «use…» porque React lo exige a sus «hooks».)
// El gesto de mantener pulsado y arrastrar arriba o abajo, para los
// cuadros del día de la Agenda. Solo sabe del dedo: qué hora sale y qué se
// guarda lo decide quien lo usa.
//   1. Pulsas y esperas un poco (sin moverte): el cuadro se «levanta».
//   2. Mueves el dedo arriba o abajo: dy son los píxeles que llevas.
//   3. Sueltas: se llama a alSoltar(dy).
// Si te mueves antes de tiempo, es que estás bajando por la pantalla y no
// pasa nada. Un toque normal sigue funcionando como un toque.

export type Fase = "quieto" | "esperando" | "moviendo" | "guardando";

// Lo que se puede mover el dedo sin que cuente como "quiero mover".
const TEMBLOR_PX = 8;

export function useArrastre<E extends HTMLElement>({
  movible,
  alSoltar,
  alNoPoderMover,
}: {
  movible: boolean;
  // Devuelve un error para enseñar, o null si ha ido bien.
  alSoltar: (dy: number) => Promise<string | null>;
  alNoPoderMover: () => void;
}) {
  const [fase, setFase] = useState<Fase>("quieto");
  const [dy, setDy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<E>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faseActual = useRef<Fase>("quieto");
  const dyActual = useRef(0);
  const sinClic = useRef(false);

  function cambiarFase(f: Fase) {
    faseActual.current = f;
    setFase(f);
  }
  function cambiarDy(valor: number) {
    dyActual.current = valor;
    setDy(valor);
  }
  function soltarReloj() {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  }

  // Mientras mueves, la pantalla no se desplaza. Tiene que ser así (y no
  // con CSS) porque el gesto ya ha empezado cuando decidimos que es para mover.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frenar = (e: TouchEvent) => {
      if (faseActual.current === "moviendo") e.preventDefault();
    };
    el.addEventListener("touchmove", frenar, { passive: false });
    return () => el.removeEventListener("touchmove", frenar);
  }, []);

  useEffect(() => soltarReloj, []);

  const handlers = {
    onPointerDown(e: React.PointerEvent<E>) {
      if (e.button !== 0 || faseActual.current === "guardando") return;
      inicio.current = { x: e.clientX, y: e.clientY };
      setError(null);
      cambiarFase("esperando");
      const puntero = e.pointerId;
      reloj.current = setTimeout(() => {
        reloj.current = null;
        sinClic.current = true;
        navigator.vibrate?.(15);
        if (!movible) {
          cambiarFase("quieto");
          alNoPoderMover();
          return;
        }
        ref.current?.setPointerCapture(puntero);
        cambiarDy(0);
        cambiarFase("moviendo");
      }, MS_PULSACION);
    },
    onPointerMove(e: React.PointerEvent<E>) {
      if (!inicio.current) return;
      const dx = e.clientX - inicio.current.x;
      const ahora = e.clientY - inicio.current.y;
      if (faseActual.current === "esperando") {
        if (Math.hypot(dx, ahora) > TEMBLOR_PX) {
          soltarReloj();
          cambiarFase("quieto");
        }
        return;
      }
      if (faseActual.current === "moviendo") cambiarDy(ahora);
    },
    async onPointerUp() {
      soltarReloj();
      inicio.current = null;
      if (faseActual.current !== "moviendo") {
        if (faseActual.current === "esperando") cambiarFase("quieto");
        return;
      }
      // Se queda en su sitio nuevo mientras se guarda.
      cambiarFase("guardando");
      const fallo = await alSoltar(dyActual.current).catch(
        () => "Sin conexión: no se ha guardado la hora nueva.",
      );
      if (fallo) setError(fallo);
      // Si va bien, la página se recarga con la hora nueva y el cuadro
      // vuelve a empezar (su clave lleva la hora). Si no, vuelve a su sitio.
      cambiarDy(0);
      cambiarFase("quieto");
    },
    onPointerCancel() {
      soltarReloj();
      inicio.current = null;
      cambiarDy(0);
      cambiarFase("quieto");
    },
    // El menú de mantener pulsado del móvil no sale.
    onContextMenu(e: React.MouseEvent<E>) {
      e.preventDefault();
    },
    // Si acabas de mover (o de mantener pulsado), no se abre.
    onClickCapture(e: React.MouseEvent<E>) {
      if (sinClic.current || faseActual.current === "guardando") {
        e.preventDefault();
        e.stopPropagation();
        sinClic.current = false;
      }
    },
  };

  return { ref, fase, dy, error, setError, handlers };
}
