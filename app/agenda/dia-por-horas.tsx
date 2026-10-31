"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical, Lock, Video } from "lucide-react";
import { moverEnElDia, terminarAntes } from "@/app/agenda/acciones-mover";
import { useArrastre } from "@/app/agenda/use-arrastre";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import {
  ALTO_MINIMO_PX,
  PX_POR_HORA,
  aHora,
  aMinutos,
  colocar,
  duracion,
  encajar,
  estaPasando,
  horaDeTerminar,
  rangoDelDia,
  siguienteParaAdelantar,
  type Colocado,
} from "@/lib/planner/dia-por-horas";
import {
  chocaCon,
  pasosDesdePixeles,
  PASO_MINUTOS,
  ratosFijos,
  sePuedeMover,
  type RatoFijo,
} from "@/lib/planner/mover-dia";

// El día por horas: cada cosa es un cuadro a su hora, tan alto como lo que
// dura. Lo que se puede mover (⠿) se mantiene pulsado y se arrastra arriba
// o abajo; al soltarlo cerca del final de otra cosa, encaja justo después.
// Si hoy algo está pasando, arriba sale «Ya ha terminado» por si acaba antes.

export type CuadroDelDia = {
  o: Ocurrencia;
  clave: string;
  href: string | null; // a dónde lleva un toque (null en lo de Google)
};

const px = (minutos: number) => (minutos / 60) * PX_POR_HORA;

export function DiaPorHoras({
  cuadros,
  sePuedeOrdenar,
  ahora,
  detallesGoogle,
}: {
  cuadros: CuadroDelDia[];
  sePuedeOrdenar: boolean; // en los días que ya pasaron, nada se mueve
  ahora: string | null; // la hora de ahora, solo si es hoy
  detallesGoogle: Record<string, React.ReactNode>;
}) {
  const [elegidoGoogle, setElegidoGoogle] = useState<string | null>(null);
  const ocurrencias = cuadros.map((c) => c.o);
  const { desde, hasta } = rangoDelDia(ocurrencias);
  const colocados = colocar(ocurrencias);
  const fijos = ratosFijos(ocurrencias);
  const porOcurrencia = new Map(cuadros.map((c) => [c.o, c]));
  const horas: number[] = [];
  for (let h = desde; h <= hasta; h += 60) horas.push(h);

  return (
    <div className="flex flex-col gap-3">
      {ahora && <AhoraMismo ocurrencias={ocurrencias} ahora={ahora} />}

      <div
        className="relative ml-12"
        style={{ height: px(hasta - desde) }}
        data-sin-deslizar
      >
        {/* Las líneas de cada hora. */}
        {horas.map((h) => (
          <div
            key={h}
            aria-hidden
            className="absolute inset-x-0 border-t border-border"
            style={{ top: px(h - desde) }}
          >
            <span className="absolute -top-2.5 -left-12 w-10 text-right text-xs text-muted">
              {aHora(h)}
            </span>
          </div>
        ))}

        {/* La línea de ahora. */}
        {ahora && aMinutos(ahora) >= desde && aMinutos(ahora) <= hasta && (
          <div
            aria-hidden
            className="absolute inset-x-0 z-20 border-t-2 border-danger"
            style={{ top: px(aMinutos(ahora) - desde) }}
          />
        )}

        {colocados.map((c) => {
          const cuadro = porOcurrencia.get(c.o)!;
          return (
            <Cuadro
              // Con la hora en la clave: al guardar una hora nueva, empieza de cero.
              key={`${cuadro.clave}|${c.o.horaInicio}|${c.o.horaFin}`}
              c={c}
              desde={desde}
              href={cuadro.href}
              movible={sePuedeOrdenar && sePuedeMover(c.o)}
              otros={colocados.filter((x) => x !== c)}
              fijos={fijos}
              alTocarGoogle={() =>
                setElegidoGoogle((v) =>
                  v === cuadro.clave ? null : cuadro.clave,
                )
              }
            />
          );
        })}
      </div>

      {elegidoGoogle && detallesGoogle[elegidoGoogle]}
    </div>
  );
}

// Un cuadro del día.
function Cuadro({
  c,
  desde,
  href,
  movible,
  otros,
  fijos,
  alTocarGoogle,
}: {
  c: Colocado<Ocurrencia>;
  desde: number;
  href: string | null;
  movible: boolean;
  otros: Colocado<Ocurrencia>[];
  fijos: RatoFijo[];
  alTocarGoogle: () => void;
}) {
  const { o } = c;
  const [aviso, setAviso] = useState<string | null>(null);
  const minutos = duracion(o);

  // La hora en la que quedaría si lo sueltas ahora.
  function horaNueva(dy: number): number {
    const bruto = c.inicio + pasosDesdePixeles(dy) * PASO_MINUTOS;
    const tope = 24 * 60 - (minutos ?? PASO_MINUTOS);
    const encajada = encajar(
      bruto,
      minutos,
      otros.map((x) => ({
        inicio: x.inicio,
        fin: x.o.horaFin ? aMinutos(x.o.horaFin) : null,
      })),
    );
    return Math.min(tope, Math.max(0, encajada));
  }

  const {
    ref: refCuadro,
    fase,
    dy,
    error: errorArrastre,
    handlers,
  } = useArrastre<HTMLDivElement>({
    movible,
    alNoPoderMover: () =>
      setAviso(
        o.bloque?.fija
          ? "Tiene la hora fija. Si quieres poder moverla, ábrela y pulsa «Que se pueda mover»."
          : "Esto es fijo: no se mueve desde aquí.",
      ),
    alSoltar: async (dy) => {
      const nueva = horaNueva(dy);
      if (nueva === c.inicio) return null;
      const { tipo, id, vez } = o.bloque!;
      const hora = aHora(nueva);
      const r = await moverEnElDia(
        tipo === "tarea"
          ? { tipo, id, fecha: o.fecha, hora }
          : { tipo, id, fecha: o.fecha, vez: vez ?? 1, hora },
      );
      return r.ok ? null : r.error;
    },
  });

  const moviendo = fase === "moviendo";
  const conHoraNueva = moviendo || fase === "guardando";
  const inicioVisible = conHoraNueva ? horaNueva(dy) : c.inicio;
  const finVisible = minutos !== null ? inicioVisible + minutos : null;
  const textoHoras = textoHora({
    horaInicio: aHora(inicioVisible),
    horaFin:
      finVisible !== null && finVisible < 24 * 60 ? aHora(finVisible) : null,
    franja: null,
  });
  const choque =
    moviendo && inicioVisible !== c.inicio
      ? chocaCon(
          aHora(inicioVisible),
          finVisible !== null && finVisible < 24 * 60
            ? aHora(finVisible)
            : null,
          fijos,
        )
      : null;

  const alto = Math.max(px(c.fin - c.inicio), ALTO_MINIMO_PX) - 2;
  const ancho = 100 / c.columnas;
  const bloque = o.bloque;
  const paraOtroMomento = bloque?.aOtraHora && !o.cambiada;
  const estilo = o.google
    ? "bg-secondary"
    : paraOtroMomento
      ? "border-2 border-dashed border-primary/60 bg-background"
      : "card";
  const etiqueta = o.google
    ? "Google"
    : paraOtroMomento
      ? "Grabada · para otro momento"
      : bloque?.grabada && bloque.aOtraHora
        ? "Grabada · la ves ahora"
        : o.cambiada
          ? "Cambiada"
          : bloque?.tipo === "tarea"
            ? "Tarea"
            : bloque
              ? "Rutina"
              : null;

  const contenido = (
    <>
      <span className="flex items-start gap-1">
        <span
          className={`min-w-0 flex-1 truncate text-sm font-medium ${
            bloque?.hecha ? "text-muted line-through" : ""
          }`}
        >
          {o.titulo}
        </span>
        {movible ? (
          <GripVertical
            aria-label="Se puede mover"
            className="size-4 shrink-0 text-muted"
          />
        ) : bloque?.grabada ? (
          <Video
            aria-label="Clase grabada"
            className="size-3.5 shrink-0 text-muted"
          />
        ) : (
          bloque?.fija && (
            <Lock
              aria-label="Hora fija"
              className="size-3.5 shrink-0 text-muted"
            />
          )
        )}
      </span>
      <span
        className={`truncate text-xs ${
          conHoraNueva ? "font-semibold text-primary" : "text-muted"
        }`}
      >
        {textoHoras}
        {etiqueta && ` · ${etiqueta}`}
      </span>
      {choque && (
        <span role="status" className="truncate text-xs text-danger">
          Se junta con «{choque.titulo}»
        </span>
      )}
      {(aviso || errorArrastre) && (
        <span role="status" className="text-xs text-muted">
          {errorArrastre ?? aviso}
        </span>
      )}
    </>
  );

  return (
    <div
      ref={refCuadro}
      {...handlers}
      onClick={o.google ? alTocarGoogle : undefined}
      className={`absolute flex select-none flex-col overflow-hidden rounded-xl px-2 py-1 [-webkit-touch-callout:none] ${estilo} ${
        moviendo
          ? "z-30 shadow-lg ring-2 ring-primary"
          : "z-10 transition-transform"
      } ${fase === "guardando" ? "opacity-70" : ""} ${
        aviso || errorArrastre ? "z-20 overflow-visible" : ""
      }`}
      style={{
        top: px(c.inicio - desde) + 1,
        height: alto,
        minHeight: aviso || errorArrastre ? alto : undefined,
        left: `calc(${c.columna * ancho}% + 2px)`,
        width: `calc(${ancho}% - 4px)`,
        transform: conHoraNueva ? `translateY(${dy}px)` : undefined,
      }}
    >
      {href ? (
        <Link
          href={href}
          draggable={false}
          className="flex min-h-0 flex-1 flex-col"
        >
          {contenido}
        </Link>
      ) : (
        <button
          type="button"
          className="flex min-h-0 flex-1 flex-col text-left"
        >
          {contenido}
        </button>
      )}
    </div>
  );
}

// «Ahora mismo»: si hoy hay una clase o un compromiso en marcha, puedes
// decir que ya ha terminado (acabó antes, o lo dejas para adelantar otra
// cosa). Después te propone adelantar lo siguiente que se puede mover.
function AhoraMismo({
  ocurrencias,
  ahora,
}: {
  ocurrencias: Ocurrencia[];
  ahora: string;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libreDesde, setLibreDesde] = useState<string | null>(null);

  const enMarcha = ocurrencias.find(
    (o) =>
      !o.google &&
      o.bloque?.tipo !== "tarea" &&
      !o.bloque?.aOtraHora &&
      estaPasando(o, ahora),
  );
  const desde = libreDesde;
  const siguiente = desde
    ? siguienteParaAdelantar(ocurrencias, desde, sePuedeMover)
    : null;

  async function terminar(o: Ocurrencia) {
    setGuardando(true);
    setError(null);
    const fin = horaDeTerminar(o.horaInicio!, ahora);
    const datos = o.bloque
      ? {
          tipo: "rutina" as const,
          id: o.bloque.id,
          fecha: o.fecha,
          vez: o.bloque.vez ?? 1,
          inicio: o.horaInicio!,
          fin,
        }
      : {
          tipo: "evento" as const,
          id: o.eventoId,
          fecha: o.fecha,
          fechaOriginal: o.fechaOriginal,
          inicio: o.horaInicio!,
          fin,
        };
    const r = await terminarAntes(datos).catch(() => ({
      ok: false as const,
      error: "Sin conexión: no se ha guardado.",
    }));
    setGuardando(false);
    if (r.ok) setLibreDesde(fin);
    else setError(r.error);
  }

  async function adelantar(o: Ocurrencia, hora: string) {
    setGuardando(true);
    const { tipo, id, vez } = o.bloque!;
    const r = await moverEnElDia(
      tipo === "tarea"
        ? { tipo, id, fecha: o.fecha, hora }
        : { tipo, id, fecha: o.fecha, vez: vez ?? 1, hora },
    ).catch(() => ({ ok: false as const, error: "Sin conexión." }));
    setGuardando(false);
    if (r.ok) setLibreDesde(null);
    else setError(r.error);
  }

  // Lo siguiente empieza en cuanto quedas libre (en un paso de 5 minutos).
  const empezarA = desde ? aHora(Math.ceil(aMinutos(desde) / 5) * 5) : null;

  if (!enMarcha && !(siguiente && empezarA)) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-secondary p-3 text-sm">
      {enMarcha && !libreDesde && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Ahora: <strong>{enMarcha.titulo}</strong> (hasta las{" "}
            {enMarcha.horaFin})
          </span>
          <button
            type="button"
            disabled={guardando}
            onClick={() => terminar(enMarcha)}
            className="button-primary py-2 text-sm"
          >
            {guardando ? "Guardando…" : "Ya ha terminado"}
          </button>
        </div>
      )}
      {siguiente && empezarA && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Te queda un hueco. ¿Adelantas <strong>{siguiente.titulo}</strong> (a
            las {siguiente.horaInicio}) a las {empezarA}?
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => adelantar(siguiente, empezarA)}
              className="button-primary py-2 text-sm"
            >
              Adelantar
            </button>
            <button
              type="button"
              onClick={() => setLibreDesde(null)}
              className="button-secondary py-2 text-sm"
            >
              No
            </button>
          </span>
        </div>
      )}
      {libreDesde && !siguiente && (
        <p className="text-muted">Apuntado. Tienes un rato libre.</p>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
