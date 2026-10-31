import Link from "next/link";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { MoverTareas } from "@/app/componentes/mover-tareas";
import { SaberMas } from "@/app/componentes/saber-mas";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas, type Tarea } from "@/lib/data/bandeja";
import { opcionesProyecto } from "@/lib/planner/areas";
import { tareasParaHoy, textoPendienteDesde } from "@/lib/planner/bandeja";

// Sección de Hoy con tus tareas, justo debajo de «Tu plan de hoy».
// El plan ya enseña las de hoy en orden; aquí están, sin culpa, las que no
// dio tiempo otros días (para decidir qué hacer con ellas), las de hoy
// plegadas para cambiarlas y, plegadas, las de los próximos 3 días.
// Las que no tienen fecha se quedan en Tareas.

// Cuántas de otros días se ven sin desplegar: el resto, plegadas.
const ATRASADAS_A_LA_VISTA = 3;

export async function TareasDeHoy({ hoy }: { hoy: string }) {
  const [tareas, { areas, proyectos }] = await Promise.all([
    listarTareas(false),
    cargarOpcionesProyecto(),
  ]);
  const { atrasadas, deHoy, proximas, sinFecha } = tareasParaHoy(tareas, hoy);
  const grupos = opcionesProyecto(areas, proyectos);
  const aLaVista = atrasadas.slice(0, ATRASADAS_A_LA_VISTA);
  const plegadas = atrasadas.slice(ATRASADAS_A_LA_VISTA);
  const fila = (tarea: Tarea) => (
    <TareaItem
      key={tarea.id}
      tarea={tarea}
      grupos={grupos}
      etiqueta={textoPendienteDesde(tarea.due_date!, hoy)}
    >
      <MoverTareas
        ids={[tarea.id]}
        hoy={hoy}
        textoHoy="Hoy"
        textoSoltar="Soltar"
      />
    </TareaItem>
  );

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Tareas</h2>
        <Link href="/bandeja?pestana=tareas" className="enlace text-sm">
          Ver todas
        </Link>
      </header>

      {atrasadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            De otros días ({atrasadas.length})
          </h3>
          <SaberMas resumen="No dio tiempo, y no pasa nada. Decide qué hacer con cada una.">
            <p>
              «Hoy» la pasa al día de hoy. «Otro día» te deja elegir cuándo en
              el calendario. «Soltar» le quita la fecha: no se borra, se queda
              en Tareas para cuando la quieras retomar.
            </p>
            <p>Mientras sigan aquí, también cuentan en tu plan de hoy.</p>
          </SaberMas>
          {atrasadas.length > 1 && (
            <MoverTareas
              ids={atrasadas.map((t) => t.id)}
              hoy={hoy}
              textoHoy="Todas a hoy"
              conOtroDia={false}
              textoSoltar="Soltar todas"
            />
          )}
          <ul className="flex flex-col gap-2">{aLaVista.map(fila)}</ul>
          {plegadas.length > 0 && (
            <details className="flex flex-col gap-2">
              <summary className="cursor-pointer text-sm text-muted">
                Ver {plegadas.length === 1 ? "1 más" : `${plegadas.length} más`}
              </summary>
              <ul className="mt-2 flex flex-col gap-2">{plegadas.map(fila)}</ul>
            </details>
          )}
        </div>
      )}

      {/* Ya salen en tu plan: aquí, plegadas, para cambiarlas. */}
      {deHoy.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer text-sm text-muted">
            Cambiar las de hoy ({deHoy.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {deHoy.map((tarea) => (
              <TareaItem key={tarea.id} tarea={tarea} grupos={grupos} />
            ))}
          </ul>
        </details>
      )}

      {proximas.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer text-sm text-muted">
            Próximos 3 días ({proximas.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {proximas.map((tarea) => (
              <TareaItem key={tarea.id} tarea={tarea} grupos={grupos} />
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/agenda#calendario" className="enlace">
          Poner tareas en un día del calendario
        </Link>
        {sinFecha > 0 && (
          <Link href="/bandeja?pestana=tareas" className="text-muted underline">
            {sinFecha === 1
              ? "1 tarea sin fecha en Tareas"
              : `${sinFecha} tareas sin fecha en Tareas`}
          </Link>
        )}
      </div>
    </section>
  );
}
