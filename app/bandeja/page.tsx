import type { Metadata } from "next";
import Link from "next/link";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { NotaItem } from "@/app/bandeja/nota-item";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { listarNotas, listarTareas, type VistaNotas } from "@/lib/data/bandeja";
import {
  agruparTareas,
  limpiarBusqueda,
  ordenarNotas,
} from "@/lib/planner/bandeja";

export const metadata: Metadata = { title: "Bandeja" };

// La Bandeja: todo lo que apuntas, en dos pestañas (Notas y Tareas).
// Lo que se ve depende de la dirección: /bandeja?pestana=tareas, ?ver=archivo, ?q=texto…
export default async function BandejaPage({
  searchParams,
}: PageProps<"/bandeja">) {
  const params = await searchParams;
  const pestana = params.pestana === "tareas" ? "tareas" : "notas";
  const ver = elegirVista(params.ver);
  const busqueda = limpiarBusqueda(params.q);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Bandeja</h1>

        <nav aria-label="Pestañas" className="flex gap-2">
          <Pestana href="/bandeja" activa={pestana === "notas"}>
            Notas
          </Pestana>
          <Pestana href="/bandeja?pestana=tareas" activa={pestana === "tareas"}>
            Tareas
          </Pestana>
        </nav>

        {pestana === "notas" ? (
          <PestanaNotas ver={ver} busqueda={busqueda} />
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
  busqueda,
}: {
  ver: VistaNotas;
  busqueda: string;
}) {
  const notas = ordenarNotas(await listarNotas(ver, busqueda));

  return (
    <section className="flex flex-col gap-4">
      {ver === "activas" && <CapturaRapida />}

      <form role="search" action="/bandeja" className="flex gap-2">
        {ver !== "activas" && <input type="hidden" name="ver" value={ver} />}
        <label htmlFor="buscar" className="sr-only">
          Buscar en las notas
        </label>
        <input
          id="buscar"
          name="q"
          type="search"
          defaultValue={busqueda}
          placeholder="Buscar en las notas"
          className="input flex-1 py-2"
        />
        <button
          type="submit"
          className="rounded-xl border border-border px-4 text-sm"
        >
          Buscar
        </button>
      </form>

      <nav aria-label="Qué notas ver" className="flex gap-4 text-sm">
        <Filtro href="/bandeja" activo={ver === "activas"}>
          Bandeja
        </Filtro>
        <Filtro href="/bandeja?ver=archivo" activo={ver === "archivo"}>
          Archivo
        </Filtro>
        <Filtro href="/bandeja?ver=papelera" activo={ver === "papelera"}>
          Papelera
        </Filtro>
      </nav>

      {notas.length === 0 ? (
        <p className="text-muted">{mensajeVacio(ver, busqueda)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notas.map((nota) => (
            <NotaItem key={nota.id} nota={nota} />
          ))}
        </ul>
      )}
    </section>
  );
}

function mensajeVacio(ver: VistaNotas, busqueda: string) {
  if (busqueda) return `No hay notas con “${busqueda}”.`;
  if (ver === "archivo") return "El archivo está vacío.";
  if (ver === "papelera") return "La papelera está vacía.";
  return "Nada por aquí. Apunta lo primero que tengas en la cabeza.";
}

async function PestanaTareas({ papelera }: { papelera: boolean }) {
  const tareas = await listarTareas(papelera);
  const grupos = agruparTareas(tareas);

  return (
    <section className="flex flex-col gap-4">
      {!papelera && <CapturaRapida destino="tarea" />}

      <nav aria-label="Qué tareas ver" className="flex gap-4 text-sm">
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
          vacio="La papelera está vacía."
        />
      ) : (
        <>
          <Grupo
            titulo="Sin planificar"
            tareas={grupos.sinPlanificar}
            vacio="Ninguna tarea sin fecha."
          />
          <Grupo
            titulo="Con fecha"
            tareas={grupos.conFecha}
            vacio="Ninguna tarea con fecha."
          />
          <Grupo
            titulo="Hechas"
            tareas={grupos.hechas}
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
  vacio,
}: {
  titulo: string;
  tareas: Awaited<ReturnType<typeof listarTareas>>;
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
            <TareaItem key={tarea.id} tarea={tarea} />
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
      className={`flex-1 rounded-xl px-4 py-2 text-center font-medium ${
        activa ? "bg-primary text-primary-foreground" : "border border-border"
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
      className={
        activo ? "font-semibold text-foreground" : "text-muted underline"
      }
    >
      {children}
    </Link>
  );
}
