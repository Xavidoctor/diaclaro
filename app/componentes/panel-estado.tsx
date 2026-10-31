"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Briefcase,
  ChartColumn,
  ListTodo,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  LifeBuoy,
  Moon,
  Pin,
  Settings,
  Sprout,
  StickyNote,
  Sunrise,
  Timer,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { CasillaHecha } from "@/app/bandeja/casilla-hecha";
import {
  cargarEstado,
  type EstadoDocumentos,
  type EstadoPanel,
  type EstadoProgreso,
  type PorHacer,
} from "@/app/componentes/acciones-estado";
import { textoHoras } from "@/lib/planner/areas";
import {
  nombreTipo,
  type TipoImportante,
} from "@/lib/planner/documentos-importantes";
import {
  abreElPanel,
  cierraElPanel,
  type Deslizamiento,
} from "@/lib/planner/panel-estado";

// Panel «Tu estado»: sale por la derecha al deslizar el dedo hacia la izquierda
// (o al pulsar la pestaña del borde). Junta tu progreso, tu carpetero de
// documentos, tus notas y atajos útiles.

// Los datos se vuelven a pedir si tienen más de un minuto.
const CADUCA_MS = 60_000;

const ATAJOS = [
  { href: "/despierto", nombre: "Despierto", Icono: Sunrise },
  { href: "/foco", nombre: "Foco", Icono: Timer },
  { href: "/habitos", nombre: "Hábitos", Icono: Sprout },
  { href: "/dormir", nombre: "Me voy a dormir", Icono: Moon },
  { href: "/dia-dificil", nombre: "Día difícil", Icono: LifeBuoy },
  { href: "/empleo", nombre: "Empleo", Icono: Briefcase },
] as const;

// No abrimos el panel si el dedo empieza en algo que ya usa el gesto:
// cajas de texto, deslizadores o listas que se mueven de lado.
function zonaConGestoPropio(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof Element)) return false;
  if (
    objetivo.closest(
      "input, textarea, select, [contenteditable], [data-sin-deslizar]",
    )
  )
    return true;
  for (let el: Element | null = objetivo; el; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el);
    if (
      (overflowX === "auto" || overflowX === "scroll") &&
      el.scrollWidth > el.clientWidth
    )
      return true;
  }
  return false;
}

export function PanelEstado() {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<EstadoPanel | null>(null);
  const [fallo, setFallo] = useState(false);
  const [cargando, empezar] = useTransition();
  const cargadoEn = useRef(0);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const pestana = useRef<HTMLButtonElement>(null);

  const abrir = useCallback(() => {
    setAbierto(true);
    if (Date.now() - cargadoEn.current < CADUCA_MS) return;
    empezar(async () => {
      try {
        const nuevos = await cargarEstado();
        setDatos(nuevos);
        setFallo(nuevos === null);
        cargadoEn.current = Date.now();
      } catch {
        setFallo(true);
      }
    });
  }, []);

  const cerrar = useCallback(() => setAbierto(false), []);

  // El gesto de deslizar, en toda la pantalla.
  useEffect(() => {
    let inicio: { x: number; y: number } | null = null;
    function alTocar(e: TouchEvent) {
      inicio =
        e.touches.length === 1 && !zonaConGestoPropio(e.target)
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : null;
    }
    function alSoltar(e: TouchEvent) {
      if (!inicio) return;
      const t = e.changedTouches[0];
      const d: Deslizamiento = {
        x0: inicio.x,
        y0: inicio.y,
        x1: t.clientX,
        y1: t.clientY,
      };
      inicio = null;
      // Si ya hay otra ventana abierta encima (un diálogo), no hacemos nada.
      if (!abierto && document.querySelector("[aria-modal='true']")) return;
      if (!abierto && abreElPanel(d, window.innerWidth)) abrir();
      else if (abierto && cierraElPanel(d)) cerrar();
    }
    document.addEventListener("touchstart", alTocar, { passive: true });
    document.addEventListener("touchend", alSoltar, { passive: true });
    return () => {
      document.removeEventListener("touchstart", alTocar);
      document.removeEventListener("touchend", alSoltar);
    };
  }, [abierto, abrir, cerrar]);

  // Con el panel abierto: Escape lo cierra y la página de detrás no se mueve.
  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const volverA = pestana.current;
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
      volverA?.focus();
    };
  }, [abierto, cerrar]);

  return (
    <>
      {/* La pestaña del borde: para abrirlo sin el gesto. */}
      <button
        ref={pestana}
        type="button"
        onClick={abrir}
        aria-label="Abrir tu estado"
        aria-expanded={abierto}
        data-guia="panel-estado"
        className="fixed top-1/2 right-0 z-30 flex h-20 w-5 -translate-y-1/2 items-center justify-end"
      >
        <span aria-hidden className="h-12 w-1.5 rounded-l-full bg-primary/40" />
      </button>

      {/* El fondo oscuro: tocarlo cierra el panel. */}
      <div
        aria-hidden
        onClick={cerrar}
        className={`fixed inset-0 z-40 bg-foreground/30 transition-opacity ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal={abierto}
        aria-labelledby="titulo-estado"
        inert={!abierto}
        className={`fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-300 ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Al pulsar cualquier enlace del panel, se cierra. */}
        <div
          className="flex flex-col gap-6 px-5 py-6"
          onClick={(e) => {
            if (e.target instanceof Element && e.target.closest("a")) cerrar();
          }}
        >
          <header className="flex items-center justify-between gap-4">
            <h2
              id="titulo-estado"
              className="text-2xl font-semibold tracking-tight"
            >
              Tu estado
            </h2>
            {/* Tu perfil y tus ajustes (una sola pantalla) y cerrar. */}
            <div className="flex items-center text-muted">
              <Link
                href="/ajustes"
                aria-label="Tú y tus ajustes"
                className="flex size-11 items-center justify-center rounded-full hover:bg-secondary"
              >
                <Settings aria-hidden className="size-5" />
              </Link>
              <button
                ref={botonCerrar}
                type="button"
                onClick={cerrar}
                aria-label="Cerrar"
                className="flex size-11 items-center justify-center rounded-full hover:bg-secondary"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
          </header>

          {/* Tu frase del perfil, si has puesto una. */}
          {datos?.frase && (
            <p className="-mt-3 text-sm text-muted italic">«{datos.frase}»</p>
          )}

          {fallo && !cargando && (
            <p role="status" className="text-sm text-muted">
              No he podido cargar tu estado. Cierra y vuelve a abrir en un
              momento.
            </p>
          )}

          {/* Lo que tienes por hacer y tus notas se ven nada más abrir;
              lo demás, al tocarlo. */}
          <ListaPorHacer
            datos={datos?.porHacer}
            cargando={!datos && cargando}
          />
          <Notas datos={datos?.notas} cargando={!datos && cargando} />
          {/* Áreas, junto a tu Progreso (antes estaba en el menú de abajo). */}
          <Link
            href="/areas"
            className="card flex min-h-14 items-center gap-2 px-4 text-lg font-semibold"
          >
            <LayoutGrid aria-hidden className="size-5 text-primary" />
            Áreas y proyectos
            <ChevronRight aria-hidden className="ml-auto size-5 text-muted" />
          </Link>

          <Progreso datos={datos?.progreso} cargando={!datos && cargando} />
          {/* Documentos y Empleo solo salen si los usas (ver Ajustes). */}
          {datos?.documentos && (
            <Carpetero datos={datos.documentos} cargando={false} />
          )}
          <Plegable Icono={Zap} titulo="Atajos">
            <ul className="grid grid-cols-2 gap-2">
              {ATAJOS.filter(
                ({ href }) => href !== "/empleo" || datos?.empleo,
              ).map(({ href, nombre, Icono }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-12 items-center gap-2 rounded-xl bg-secondary p-3 text-sm font-medium"
                  >
                    <Icono aria-hidden className="size-5 text-primary" />
                    {nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </Plegable>
        </div>
      </div>
    </>
  );
}

function Cargando() {
  return <p className="text-sm text-muted">Cargando…</p>;
}

// Una sección cerrada: solo se ve su título hasta que la tocas.
function Plegable({
  Icono,
  titulo,
  children,
  href,
  enlace,
}: {
  Icono: typeof Wallet;
  titulo: string;
  children: React.ReactNode;
  href?: string;
  enlace?: string;
}) {
  return (
    <details className="group card p-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        <Icono aria-hidden className="size-5 text-primary" />
        {titulo}
        <ChevronDown
          aria-hidden
          className="ml-auto size-5 text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {children}
        {href && enlace && (
          <Link href={href} className="enlace self-start text-sm">
            {enlace}
          </Link>
        )}
      </div>
    </details>
  );
}

function horas(minutos: number | null): string {
  return minutos === null ? "—" : textoHoras(minutos);
}

function Progreso({
  datos,
  cargando,
}: {
  datos: EstadoProgreso | null | undefined;
  cargando: boolean;
}) {
  return (
    <Plegable
      Icono={ChartColumn}
      titulo="Progreso"
      href="/areas/semana#horas"
      enlace="Ver tu progreso completo"
    >
      {cargando && <Cargando />}
      {datos === null && (
        <p className="text-sm text-muted">Ahora no puedo calcularlo.</p>
      )}
      {datos && (
        <ul className="grid grid-cols-3 gap-2">
          <Cifra nombre="Usado hoy" valor={horas(datos.hoy.usado)} />
          <Cifra nombre="Sin apuntar hoy" valor={horas(datos.hoy.sinApuntar)} />
          <Cifra nombre="Sueño medio" valor={horas(datos.sueno.media)} />
        </ul>
      )}
      {datos && (
        <p className="text-xs text-muted">
          En los últimos 7 días has usado de media {horas(datos.usado.media)} al
          día
          {datos.sinApuntar.media !== null &&
            ` y te quedaron ${textoHoras(datos.sinApuntar.media)} sin apuntar`}
          .
        </p>
      )}
    </Plegable>
  );
}

function Cifra({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <li className="card flex flex-col gap-1 p-3">
      <span className="text-sm font-semibold whitespace-nowrap">{valor}</span>
      <span className="text-xs text-muted">{nombre}</span>
    </li>
  );
}

// Cada tipo de documento con su color, todos sacados del verde de la app.
const COLOR_TIPO: Record<TipoImportante, string> = {
  identidad: "bg-primary text-primary-foreground",
  viajes:
    "bg-[color-mix(in_srgb,var(--primary)_78%,var(--foreground))] text-primary-foreground",
  entradas:
    "bg-[color-mix(in_srgb,var(--primary)_60%,var(--foreground))] text-primary-foreground",
  salud:
    "bg-[color-mix(in_srgb,var(--primary)_45%,var(--foreground))] text-primary-foreground",
  otros: "bg-secondary text-foreground",
};

// El carpetero: tarjetas apiladas como en una cartera. De cada una se ve
// la parte de arriba; tocarla abre el documento en Drive.
function Carpetero({
  datos,
  cargando,
}: {
  datos: EstadoDocumentos | undefined;
  cargando: boolean;
}) {
  return (
    <Plegable
      Icono={Wallet}
      titulo="Documentos"
      href="/documentos"
      enlace={
        datos?.estado === "ok" && datos.total > datos.lista.length
          ? `Ver los ${datos.total}`
          : "Abrir Documentos importantes"
      }
    >
      {cargando && <Cargando />}
      {datos?.estado === "no-disponible" && (
        <p className="text-sm text-muted">
          La conexión con Google aún no está activada en esta app.
        </p>
      )}
      {datos?.estado === "sin-drive" && (
        <p className="text-sm text-muted">
          Conecta tu Google Drive en{" "}
          <Link href="/documentos" className="enlace">
            Documentos importantes
          </Link>{" "}
          para tener aquí tu DNI, billetes y entradas.
        </p>
      )}
      {datos?.estado === "fallo" && (
        <p className="text-sm text-muted">
          Ahora mismo no puedo leer tu Drive.
        </p>
      )}
      {datos?.estado === "ok" && datos.lista.length === 0 && (
        <p className="text-sm text-muted">
          Aún no has guardado ninguno. Guárdalos en{" "}
          <Link href="/documentos" className="enlace">
            Documentos importantes
          </Link>
          .
        </p>
      )}
      {datos?.estado === "ok" && datos.lista.length > 0 && (
        <ul className="flex flex-col">
          {datos.lista.map((d, i) => (
            <li
              key={d.id}
              className={i === 0 ? "" : "-mt-14"}
              style={{ zIndex: i }}
            >
              <a
                href={d.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative flex h-24 flex-col justify-between rounded-2xl p-4 shadow-[0_-2px_8px_rgb(29_42_36/0.18)] transition-transform active:-translate-y-1 ${COLOR_TIPO[d.tipo]}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">
                    {d.nombre}
                  </span>
                  <span className="shrink-0 text-xs opacity-80">
                    {nombreTipo(d.tipo)}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs opacity-80">
                  Abrir en Drive
                  <ExternalLink aria-hidden className="size-3" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Plegable>
  );
}

// Las últimas notas. La chincheta de arriba cambia a tus notas fijadas.
function Notas({
  datos,
  cargando,
}: {
  datos: EstadoPanel["notas"] | undefined;
  cargando: boolean;
}) {
  const [soloFijadas, setSoloFijadas] = useState(false);
  const lista = datos ? (soloFijadas ? datos.fijadas : datos.ultimas) : null;
  return (
    <section aria-labelledby="estado-notas" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="estado-notas"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <StickyNote aria-hidden className="size-5 text-primary" />
          {soloFijadas ? "Notas fijadas" : "Últimas notas"}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoloFijadas((v) => !v)}
            aria-pressed={soloFijadas}
            aria-label="Ver solo las notas fijadas"
            className={`flex size-11 items-center justify-center rounded-full ${
              soloFijadas
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-primary"
            }`}
          >
            <Pin aria-hidden className="size-5" />
          </button>
          <Link href="/bandeja" className="enlace px-2 text-sm">
            Ver todas
          </Link>
        </div>
      </div>
      {cargando && <Cargando />}
      {datos === null && (
        <p className="text-sm text-muted">Ahora no puedo cargar tus notas.</p>
      )}
      {lista?.length === 0 && (
        <p className="text-sm text-muted">
          {soloFijadas
            ? "No tienes notas fijadas. En Notas, fija las que quieras tener siempre a mano."
            : "No tienes notas. Apunta lo que se te ocurra en Notas."}
        </p>
      )}
      {lista && lista.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lista.map((n) => (
            <li key={n.id}>
              <Link
                href="/bandeja"
                className="card flex items-start gap-2 p-3 text-sm"
              >
                {n.fijada && (
                  <Pin
                    aria-label="Fijada"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                )}
                <span className="min-w-0 break-words">{n.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Tus tareas pendientes, en una lista: lo atrasado, lo de hoy y lo de esta
// semana. La casilla la marca como hecha (y la quita de la lista).
function ListaPorHacer({
  datos,
  cargando,
}: {
  datos: PorHacer | null | undefined;
  cargando: boolean;
}) {
  const [hechas, setHechas] = useState<string[]>([]);
  const lista = datos?.lista.filter((t) => !hechas.includes(t.id)) ?? null;
  return (
    <section aria-labelledby="estado-por-hacer" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="estado-por-hacer"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <ListTodo aria-hidden className="size-5 text-primary" />
          Por hacer
        </h3>
        <Link href="/bandeja?pestana=tareas" className="enlace px-2 text-sm">
          Ver todas
        </Link>
      </div>
      {cargando && <Cargando />}
      {datos === null && (
        <p className="text-sm text-muted">Ahora no puedo cargar tus tareas.</p>
      )}
      {lista?.length === 0 && (
        <p className="text-sm text-muted">No tienes nada pendiente. ¡Bien!</p>
      )}
      {lista && lista.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lista.map((t) => (
            <li key={t.id} className="card flex items-start gap-3 p-3 text-sm">
              <CasillaHecha
                id={t.id}
                titulo={t.titulo}
                previstos={t.previstos}
                alMarcar={() => setHechas((h) => [...h, t.id])}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="break-words">{t.titulo}</span>
                <span
                  className={`text-xs ${t.atrasada ? "text-danger" : "text-muted"}`}
                >
                  {t.cuando}
                  {t.hora && ` · ${t.hora}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {datos && datos.mas > 0 && (
        <p className="text-xs text-muted">
          {datos.mas === 1 ? "Y 1 más" : `Y ${datos.mas} más`} en Tareas.
        </p>
      )}
    </section>
  );
}
