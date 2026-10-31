"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GripVertical, Lock } from "lucide-react";
import { moverEnElDia } from "@/app/agenda/acciones-mover";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import {
  MS_PULSACION,
  chocaCon,
  finMovido,
  horaMovida,
  pasosDesdePixeles,
  type RatoFijo,
} from "@/lib/planner/mover-dia";

// Una tarea o rutina con hora en la lista del día.
// Si se puede mover: mantenla pulsada y muévela arriba (más pronto) o abajo
// (más tarde). Cada poco que mueves el dedo son 15 minutos. Al soltar se
// guarda la hora nueva. En una rutina, solo cambia ese día.
// Si es fija (con candado), al mantenerla pulsada te explica por qué no se mueve.
// Un toque normal abre la tarea o la rutina, como siempre.

type Fase = "quieto" | "esperando" | "moviendo" | "guardando";

// Lo que se puede mover el dedo sin que cuente como "quiero mover"
// (si te mueves más antes de tiempo, es que estás bajando por la pantalla).
const TEMBLOR_PX = 8;

export function BloqueMovible({
  o,
  href,
  movible,
  fijos,
}: {
  o: Ocurrencia;
  href: string;
  movible: boolean;
  fijos: RatoFijo[]; // lo fijo de ese día, para avisar si lo pisas
}) {
  const { tipo, id, hecha, vez, fija } = o.bloque!;
  const [fase, setFase] = useState<Fase>("quieto");
  const [dy, setDy] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const tarjeta = useRef<HTMLAnchorElement>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faseActual = useRef<Fase>("quieto");
  const sinClic = useRef(false);

  function cambiarFase(f: Fase) {
    faseActual.current = f;
    setFase(f);
  }

  // Mientras mueves, la pantalla no se desplaza. Tiene que ser así (y no
  // con CSS) porque el gesto ya ha empezado cuando decidimos que es para mover.
  useEffect(() => {
    const el = tarjeta.current;
    if (!el) return;
    const frenar = (e: TouchEvent) => {
      if (faseActual.current === "moviendo") e.preventDefault();
    };
    el.addEventListener("touchmove", frenar, { passive: false });
    return () => el.removeEventListener("touchmove", frenar);
  }, []);

  useEffect(
    () => () => {
      if (reloj.current) clearTimeout(reloj.current);
    },
    [],
  );

  const inicioHora = o.horaInicio!;
  const pasos = pasosDesdePixeles(dy);
  const nueva = horaMovida(inicioHora, pasos);
  const nuevoFin = finMovido(inicioHora, o.horaFin, nueva);
  const choque =
    fase === "moviendo" && pasos !== 0
      ? chocaCon(nueva, nuevoFin, fijos)
      : null;

  function soltarReloj() {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  }

  function alPulsar(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || fase === "guardando") return;
    inicio.current = { x: e.clientX, y: e.clientY };
    setAviso(null);
    cambiarFase("esperando");
    const puntero = e.pointerId;
    reloj.current = setTimeout(() => {
      reloj.current = null;
      sinClic.current = true;
      navigator.vibrate?.(15);
      if (!movible) {
        cambiarFase("quieto");
        setAviso(
          fija
            ? "Esta rutina tiene la hora fija. Si quieres poder moverla, ábrela y quítale «Hora fija»."
            : "Esto no se puede mover desde aquí.",
        );
        return;
      }
      tarjeta.current?.setPointerCapture(puntero);
      setDy(0);
      cambiarFase("moviendo");
    }, MS_PULSACION);
  }

  function alMover(e: React.PointerEvent<HTMLAnchorElement>) {
    if (!inicio.current) return;
    const dx = e.clientX - inicio.current.x;
    const dyAhora = e.clientY - inicio.current.y;
    if (faseActual.current === "esperando") {
      // Te has movido antes de tiempo: estás bajando por la pantalla.
      if (Math.hypot(dx, dyAhora) > TEMBLOR_PX) {
        soltarReloj();
        cambiarFase("quieto");
      }
      return;
    }
    if (faseActual.current === "moviendo") setDy(dyAhora);
  }

  async function alSoltar() {
    soltarReloj();
    inicio.current = null;
    if (faseActual.current !== "moviendo") {
      if (faseActual.current === "esperando") cambiarFase("quieto");
      return;
    }
    if (pasos === 0) {
      setDy(0);
      cambiarFase("quieto");
      return;
    }
    // Se queda en su sitio nuevo mientras se guarda.
    cambiarFase("guardando");
    const r = await moverEnElDia(
      tipo === "tarea"
        ? { tipo, id, fecha: o.fecha, hora: nueva }
        : { tipo, id, fecha: o.fecha, vez: vez ?? 1, hora: nueva },
    ).catch(() => ({
      ok: false as const,
      error: "Sin conexión: no se ha guardado la hora nueva.",
    }));
    if (!r.ok) {
      setAviso(r.error);
      setDy(0);
      cambiarFase("quieto");
    }
    // Si va bien, la lista se recarga y la tarjeta sale en su hora nueva.
  }

  function alCancelar() {
    soltarReloj();
    inicio.current = null;
    setDy(0);
    cambiarFase("quieto");
  }

  const moviendo = fase === "moviendo";
  const conHoraNueva = moviendo || fase === "guardando";
  const horaVisible = conHoraNueva
    ? textoHora({ horaInicio: nueva, horaFin: nuevoFin, franja: null })
    : textoHora(o);

  return (
    <div className="flex flex-col gap-1">
      <Link
        ref={tarjeta}
        href={href}
        draggable={false}
        data-sin-deslizar
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alCancelar}
        onContextMenu={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // Si acabas de mover (o de mantener pulsado), no se abre.
          if (sinClic.current || fase === "guardando") {
            e.preventDefault();
            e.stopPropagation();
            sinClic.current = false;
          }
        }}
        aria-roledescription={movible ? "bloque que se puede mover" : undefined}
        style={conHoraNueva ? { transform: `translateY(${dy}px)` } : undefined}
        className={`card relative flex select-none flex-col gap-1 p-4 [-webkit-touch-callout:none] ${
          moviendo
            ? "z-10 scale-[1.02] shadow-lg ring-2 ring-primary"
            : "transition-transform"
        } ${fase === "guardando" ? "opacity-70" : ""}`}
      >
        <span className="flex items-baseline gap-3">
          <span
            className={`w-28 shrink-0 text-sm ${
              conHoraNueva ? "font-semibold text-primary" : "text-muted"
            }`}
          >
            {horaVisible}
          </span>
          <span
            className={`flex-1 break-words ${hecha ? "text-muted line-through" : ""}`}
          >
            {o.titulo}
          </span>
          <span className="flex shrink-0 items-center gap-1 self-center text-xs text-muted">
            {o.cambiada ? "Cambiada" : tipo === "tarea" ? "Tarea" : "Rutina"}
            {movible ? (
              <GripVertical aria-label="Se puede mover" className="size-4" />
            ) : (
              fija && <Lock aria-label="Hora fija" className="size-3.5" />
            )}
          </span>
        </span>
        {choque && (
          <span className="text-xs text-danger" role="status">
            Se junta con «{choque.titulo}» (
            {textoHora({
              horaInicio: choque.inicio,
              horaFin: choque.fin,
              franja: null,
            })}
            )
          </span>
        )}
      </Link>
      {aviso && (
        <p className="px-1 text-xs text-muted" role="status">
          {aviso}
        </p>
      )}
    </div>
  );
}
