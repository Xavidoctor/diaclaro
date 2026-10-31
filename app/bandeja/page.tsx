import type { Metadata } from "next";
import Link from "next/link";
import { AyudaPantalla } from "@/app/componentes/ayuda-guia";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { NotaItem } from "@/app/bandeja/nota-item";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { PonerleDia } from "@/app/componentes/ponerle-dia";
import { diaDeHoy } from "@/lib/data/dia-activo";
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
  enlaceNotas,
  limpiarBusqueda,
  ordenarNotas,
  seccionesTareas,
  textoPendienteDesde,
} from "@/lib/planner/bandeja";
import {
  NOMBRE_TIPO,
  TIPOS_NOTA,
  contarEtiquetas,
  esTipoNota,
  limpiarEtiqueta,
} from "@/lib/planner/etiquetas";

export const metadata: Metadata = { title: "Tareas y notas" };

// Tareas y Notas: todo lo que apuntas. Cada una tiene su botón en el menú de
// abajo, así que la pantalla enseña solo una de las dos.
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
        <h1 className="text-3xl font-semibold tracking-tight">
          {pestana === "tareas" ? "Tareas" : "Notas"}
        </h1>

        <AyudaPantalla seccion="bandeja" />

        {pestana === "notas" ? (
          <PestanaNotas ver={ver} filtros={filtros} />
        ) : (
          <PestanaTareas papelera={ver === "papelera"} />
        )}
      </main>
      <BarraInferior
        actual={pestana === "tareas" ? "/bandeja?pestana=tareas" : "/bandeja"}
      />
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
      {ver === "activas" && <CapturaRapida conAsistente={ia} />}

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
          Notas
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
  const [tareas, { areas, proyectos }, hoy] = await Promise.all([
    listarTareas(papelera),
    cargarOpcionesProyecto(),
    diaDeHoy(),
  ]);
  const secciones = seccionesTareas(tareas, hoy);
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
          <Seccion
            titulo="Hoy"
            tono="hoy"
            tareas={secciones.hoy}
            opciones={opciones}
            vacio="Nada para hoy. Puedes coger algo de «Sin día»."
            hoy={hoy}
          />
          <Seccion
            titulo="Sin día"
            tono="general"
            tareas={secciones.sinDia}
            opciones={opciones}
            vacio="Tu lista general está vacía."
            hoy={hoy}
            ponerleDia
          />
          <Plegado
            titulo="Más adelante"
            tareas={secciones.masAdelante}
            opciones={opciones}
          />
          <Plegado
            titulo="Hechas"
            tareas={secciones.hechas}
            opciones={opciones}
          />
        </>
      )}
    </section>
  );
}

// «Hoy» y «Sin día», las dos listas que importan, cada una en su caja:
// «Hoy» con fondo verde suave y «Sin día» blanca con una rayita gris.
// Son tonos suaves a propósito: cada tarea ya puede llevar el color de su área.
function Seccion({
  titulo,
  tono,
  tareas,
  opciones,
  vacio,
  hoy,
  ponerleDia = false,
}: {
  titulo: string;
  tono: "hoy" | "general";
  tareas: Awaited<ReturnType<typeof listarTareas>>;
  opciones: GrupoOpciones[];
  vacio: string;
  hoy: string;
  ponerleDia?: boolean; // con él, cada tarea lleva «Ponerle día»
}) {
  const caja =
    tono === "hoy"
      ? "border-primary bg-secondary"
      : "border-border bg-surface";
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-2xl border-l-4 p-3 ${caja}`}
    >
      <h2
        className={`px-1 text-lg font-semibold ${
          tono === "hoy" ? "text-primary" : ""
        }`}
      >
        {titulo}{" "}
        {tareas.length > 0 && (
          <span className="text-sm font-normal text-muted">
            {tareas.length}
          </span>
        )}
      </h2>
      {tareas.length === 0 ? (
        <p className="px-1 text-sm text-muted">{vacio}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tareas.map((tarea) => (
            <TareaItem
              key={tarea.id}
              tarea={tarea}
              grupos={opciones}
              etiqueta={etiquetaDeHoy(tarea, hoy)}
            >
              {ponerleDia && <PonerleDia id={tarea.id} hoy={hoy} />}
            </TareaItem>
          ))}
        </ul>
      )}
    </section>
  );
}

// Aviso corto para las tareas que tocaban antes de hoy: «De ayer», «De hace 3 días».
function etiquetaDeHoy(
  tarea: { due_date: string | null; due_kind?: string },
  hoy: string,
) {
  if (!tarea.due_date || tarea.due_date >= hoy) return undefined;
  const desde = textoPendienteDesde(tarea.due_date, hoy);
  return tarea.due_kind === "limite" ? `Fecha límite ${desde}` : desde;
}

// «Más adelante» y «Hechas»: cerradas hasta que las tocas, para que no estorben.
function Plegado({
  titulo,
  tareas,
  opciones,
}: {
  titulo: string;
  tareas: Awaited<ReturnType<typeof listarTareas>>;
  opciones: GrupoOpciones[];
}) {
  if (tareas.length === 0) return null;
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted">
        {titulo} ({tareas.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        {tareas.map((tarea) => (
          <TareaItem key={tarea.id} tarea={tarea} grupos={opciones} />
        ))}
      </ul>
    </details>
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
