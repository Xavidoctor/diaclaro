import type { Metadata } from "next";
import Link from "next/link";
import { AyudaPantalla } from "@/app/componentes/ayuda-guia";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { NotaItem } from "@/app/bandeja/nota-item";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { badgeVariants } from "@/components/ui/badge";
import { iaDisponible } from "@/lib/ai/groq";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import {
  listarEtiquetasUsadas,
  listarNotas,
  listarTareas,
  type FiltrosNotas,
  type VistaNotas,
} from "@/lib/data/bandeja";
import { opcionesProyecto, type GrupoOpciones } from "@/lib/planner/areas";
import {
  agruparTareas,
  enlaceNotas,
  limpiarBusqueda,
  ordenarNotas,
} from "@/lib/planner/bandeja";
import {
  NOMBRE_TIPO,
  TIPOS_NOTA,
  contarEtiquetas,
  esTipoNota,
  limpiarEtiqueta,
} from "@/lib/planner/etiquetas";

export const metadata: Metadata = { title: "Bandeja" };

// La Bandeja: todo lo que apuntas, en dos pestañas (Notas y Tareas).
// Lo que se ve depende de la dirección: /bandeja?pestana=tareas, ?ver=archivo, ?q=texto,
// ?etiqueta=ade, ?tipo=idea…
export default async function BandejaPage({
  searchParams,
}: PageProps<"/bandeja">) {
  const params = await searchParams;
  const pestana = params.pestana === "tareas" ? "tareas" : "notas";
  const ver = elegirVista(params.ver);
  const filtros: FiltrosNotas = {
    busqueda: limpiarBusqueda(params.q),
    etiqueta:
      typeof params.etiqueta === "string"
        ? limpiarEtiqueta(params.etiqueta)
        : null,
    tipo: esTipoNota(params.tipo) ? params.tipo : null,
  };

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Bandeja</h1>

        <AyudaPantalla seccion="bandeja" />

        <nav
          aria-label="Pestañas"
          data-guia="pestanas"
          className="flex gap-1 rounded-2xl bg-secondary p-1"
        >
          <Pestana href="/bandeja" activa={pestana === "notas"}>
            Notas
          </Pestana>
          <Pestana href="/bandeja?pestana=tareas" activa={pestana === "tareas"}>
            Tareas
          </Pestana>
        </nav>

        {pestana === "notas" ? (
          <PestanaNotas ver={ver} filtros={filtros} />
        ) : (
          <PestanaTareas papelera={ver === "papelera"} />
        )}
      </main>
      <BarraInferior actual="/bandeja" />
    </>
  );
}

function elegirVista(valor: unknown): VistaNotas {
  return valor === "archivo" || valor === "papelera" ? valor : "activas";
}

async function PestanaNotas({
  ver,
  filtros,
}: {
  ver: VistaNotas;
  filtros: FiltrosNotas;
}) {
  const { busqueda, etiqueta, tipo } = filtros;
  const [notas, conEtiquetas, { areas, proyectos }] = await Promise.all([
    listarNotas(ver, filtros).then(ordenarNotas),
    listarEtiquetasUsadas(),
    cargarOpcionesProyecto(),
  ]);
  const grupos = opcionesProyecto(areas, proyectos);
  const ia = iaDisponible();
  const etiquetas = contarEtiquetas(conEtiquetas);
  const hayFiltros = Boolean(busqueda || etiqueta || tipo);

  return (
    <section className="flex flex-col gap-4">
      {ver === "activas" && (
        <>
          <CapturaRapida />
          <Link href="/ordenar" className="enlace self-start text-sm">
            ¿Mucho en la cabeza? Ordénalo con IA
          </Link>
        </>
      )}

      <form role="search" action="/bandeja" className="flex flex-col gap-2">
        {ver !== "activas" && <input type="hidden" name="ver" value={ver} />}
        {etiqueta && <input type="hidden" name="etiqueta" value={etiqueta} />}
        <div className="flex gap-2">
          <label htmlFor="buscar" className="sr-only">
            Buscar en las notas
          </label>
          <input
            id="buscar"
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar en las notas"
            className="input min-w-0 flex-1 py-2"
          />
          <label htmlFor="tipo" className="sr-only">
            Tipo de nota
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={tipo ?? ""}
            className="input w-32 px-2 py-2 text-sm"
          >
            <option value="">Todos</option>
            {TIPOS_NOTA.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="self-start rounded-xl border border-border px-4 py-2 text-sm"
        >
          Buscar
        </button>
      </form>

      {etiquetas.length > 0 && (
        <nav aria-label="Filtrar por etiqueta" className="flex flex-wrap gap-2">
          {etiquetas.map(({ etiqueta: e, cuantas }) => {
            const activa = e === etiqueta;
            return (
              <Link
                key={e}
                href={enlaceNotas({
                  ver,
                  q: busqueda,
                  tipo,
                  etiqueta: activa ? null : e,
                })}
                aria-current={activa ? "page" : undefined}
                className={badgeVariants({
                  variant: activa ? "default" : "outline",
                })}
              >
                #{e} · {cuantas}
              </Link>
            );
          })}
        </nav>
      )}

      <nav
        aria-label="Qué notas ver"
        className="flex items-center gap-1 text-sm"
      >
        <Filtro href="/bandeja" activo={ver === "activas"}>
          Bandeja
        </Filtro>
        <Filtro href="/bandeja?ver=archivo" activo={ver === "archivo"}>
          Archivo
        </Filtro>
        <Filtro href="/bandeja?ver=papelera" activo={ver === "papelera"}>
          Papelera
        </Filtro>
        {hayFiltros && (
          <Link
            href={enlaceNotas({ ver })}
            className="ml-auto text-muted underline"
          >
            Quitar filtros
          </Link>
        )}
      </nav>

      {notas.length === 0 ? (
        <p className="text-muted">{mensajeVacio(ver, hayFiltros)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notas.map((nota) => (
            <NotaItem
              key={nota.id}
              nota={nota}
              ver={ver}
              grupos={grupos}
              ia={ia}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function mensajeVacio(ver: VistaNotas, hayFiltros: boolean) {
  if (hayFiltros) return "No hay notas con estos filtros.";
  if (ver === "archivo") return "El archivo está vacío.";
  if (ver === "papelera") return "La papelera está vacía.";
  return "Nada por aquí. Apunta lo primero que tengas en la cabeza.";
}

async function PestanaTareas({ papelera }: { papelera: boolean }) {
  const [tareas, { areas, proyectos }] = await Promise.all([
    listarTareas(papelera),
    cargarOpcionesProyecto(),
  ]);
  const grupos = agruparTareas(tareas);
  const opciones = opcionesProyecto(areas, proyectos);

  return (
    <section className="flex flex-col gap-4">
      {!papelera && <CapturaRapida destino="tarea" />}

      <nav
        aria-label="Qué tareas ver"
        className="flex items-center gap-1 text-sm"
      >
        <Filtro href="/bandeja?pestana=tareas" activo={!papelera}>
          Tareas
        </Filtro>
        <Filtro href="/bandeja?pestana=tareas&ver=papelera" activo={papelera}>
          Papelera
        </Filtro>
      </nav>

      {papelera ? (
        <Grupo
          titulo="En la papelera"
          tareas={tareas}
          opciones={opciones}
          vacio="La papelera está vacía."
        />
      ) : (
        <>
          <Grupo
            titulo="Sin planificar"
            tareas={grupos.sinPlanificar}
            opciones={opciones}
            vacio="Ninguna tarea sin fecha."
          />
          <Grupo
            titulo="Con fecha"
            tareas={grupos.conFecha}
            opciones={opciones}
            vacio="Ninguna tarea con fecha."
          />
          <Grupo
            titulo="Hechas"
            tareas={grupos.hechas}
            opciones={opciones}
            vacio="Aún no has marcado ninguna."
          />
        </>
      )}
    </section>
  );
}

function Grupo({
  titulo,
  tareas,
  opciones,
  vacio,
}: {
  titulo: string;
  tareas: Awaited<ReturnType<typeof listarTareas>>;
  opciones: GrupoOpciones[];
  vacio: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {titulo} {tareas.length > 0 && `(${tareas.length})`}
      </h2>
      {tareas.length === 0 ? (
        <p className="text-sm text-muted">{vacio}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tareas.map((tarea) => (
            <TareaItem key={tarea.id} tarea={tarea} grupos={opciones} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Pestana({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      className={`flex min-h-10 flex-1 items-center justify-center rounded-xl px-4 font-semibold ${
        activa ? "bg-surface text-primary shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}

function Filtro({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 ${
        activo ? "bg-secondary font-semibold text-primary" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}
