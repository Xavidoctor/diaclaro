import Link from "next/link";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { MoverTareas } from "@/app/componentes/mover-tareas";
import { SaberMas } from "@/app/componentes/saber-mas";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas, type Tarea } from "@/lib/data/bandeja";
import { opcionesProyecto, type GrupoOpciones } from "@/lib/planner/areas";
import { tareasParaHoy, textoPendienteDesde } from "@/lib/planner/bandeja";

// Sección de Hoy con tus tareas: primero las que no acabaste los días
// anteriores (para que no se pierdan), luego las de hoy y, plegadas, las de
// los próximos 3 días. Las que no tienen fecha se quedan en la Bandeja.
export async function TareasDeHoy({ hoy }: { hoy: string }) {
  const [tareas, { areas, proyectos }] = await Promise.all([
    listarTareas(false),
    cargarOpcionesProyecto(),
  ]);
  const { atrasadas, deHoy, proximas, sinFecha } = tareasParaHoy(tareas, hoy);
  const grupos = opcionesProyecto(areas, proyectos);
  const nada = atrasadas.length === 0 && deHoy.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Tareas</h2>
        <Link href="/bandeja?pestana=tareas" className="enlace text-sm">
          Ver todas
        </Link>
      </header>

      {nada && (
        <p className="text-sm text-muted">
          No tienes tareas para hoy ni pendientes de otros días.
        </p>
      )}

      {atrasadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Pendientes de días anteriores ({atrasadas.length})
          </h3>
          <SaberMas resumen="No las acabaste. Siguen aquí hasta que las hagas o las cambies de día.">
            <p>
              Cada tarea dice de qué día era. Con «Pasar a hoy» la pones en el
              día de hoy; con «Otro día» eliges en el calendario cuándo hacerla.
              Si ya no hace falta, ábrela con «Editar» y muévela a la papelera.
            </p>
            <p>Mientras sigan pendientes, también cuentan en tu plan de hoy.</p>
          </SaberMas>
          {atrasadas.length > 1 && (
            <MoverTareas
              ids={atrasadas.map((t) => t.id)}
              hoy={hoy}
              textoHoy="Pasar todas a hoy"
              conOtroDia={false}
            />
          )}
          <ul className="flex flex-col gap-2">
            {atrasadas.map((tarea) => (
              <TareaItem
                key={tarea.id}
                tarea={tarea}
                grupos={grupos}
                etiqueta={textoPendienteDesde(tarea.due_date!, hoy)}
              >
                <MoverTareas ids={[tarea.id]} hoy={hoy} />
              </TareaItem>
            ))}
          </ul>
        </div>
      )}

      <Grupo titulo="Para hoy" tareas={deHoy} grupos={grupos} />

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

function Grupo({
  titulo,
  tareas,
  grupos,
}: {
  titulo: string;
  tareas: Tarea[];
  grupos: GrupoOpciones[];
}) {
  if (tareas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {titulo} ({tareas.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {tareas.map((tarea) => (
          <TareaItem key={tarea.id} tarea={tarea} grupos={grupos} />
        ))}
      </ul>
    </div>
  );
}
