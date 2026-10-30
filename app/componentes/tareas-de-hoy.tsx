import Link from "next/link";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { listarTareas, type Tarea } from "@/lib/data/bandeja";
import { tareasParaHoy } from "@/lib/planner/bandeja";

// Sección de Hoy con las tareas a tener en cuenta: las atrasadas, las de hoy
// y las de los próximos 3 días. Las que no tienen fecha se quedan en la Bandeja.
export async function TareasDeHoy({ hoy }: { hoy: string }) {
  const { atrasadas, deHoy, proximas, sinFecha } = tareasParaHoy(
    await listarTareas(false),
    hoy,
  );
  const nada =
    atrasadas.length === 0 && deHoy.length === 0 && proximas.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Tareas</h2>
        <Link href="/bandeja?pestana=tareas" className="text-sm underline">
          Ver todas
        </Link>
      </header>

      {nada && (
        <p className="text-sm text-muted">
          No tienes tareas con fecha para hoy ni para los próximos días.
        </p>
      )}
      <Grupo titulo="Atrasadas" tareas={atrasadas} aviso />
      <Grupo titulo="Para hoy" tareas={deHoy} />
      <Grupo titulo="Próximos 3 días" tareas={proximas} />

      {sinFecha > 0 && (
        <Link
          href="/bandeja?pestana=tareas"
          className="text-sm text-muted underline"
        >
          {sinFecha === 1
            ? "1 tarea sin fecha en la Bandeja"
            : `${sinFecha} tareas sin fecha en la Bandeja`}
        </Link>
      )}
    </section>
  );
}

function Grupo({
  titulo,
  tareas,
  aviso,
}: {
  titulo: string;
  tareas: Tarea[];
  aviso?: boolean;
}) {
  if (tareas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3
        className={`text-sm font-semibold uppercase tracking-wide ${
          aviso ? "text-danger" : "text-muted"
        }`}
      >
        {titulo} ({tareas.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {tareas.map((tarea) => (
          <TareaItem key={tarea.id} tarea={tarea} />
        ))}
      </ul>
    </div>
  );
}
