import Link from "next/link";
import { importarDeGoogle } from "@/app/agenda/actions";
import { EtiquetaGoogle } from "@/app/componentes/aviso-google";
import { textoHora, type Ocurrencia } from "@/lib/planner/agenda";
import { claveGoogle } from "@/lib/planner/google-calendar";

// Un evento de tu Google Calendar en la Agenda. Se ve, pero no se cambia
// (eso se hace en Google). Puedes pasarlo a tus tareas o ponerte a ello
// con el temporizador de foco: la tarea solo se crea en DíaClaro.
export function EventoGoogle({
  o,
  tareaId,
  puedeImportar,
}: {
  o: Ocurrencia;
  tareaId: string | undefined; // la tarea que ya creaste desde este evento
  puedeImportar: boolean;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex items-baseline gap-3">
        <span className="w-28 shrink-0 text-sm text-muted">{textoHora(o)}</span>
        <span className="flex-1 break-words">{o.titulo}</span>
        <EtiquetaGoogle libre={o.google?.libre ?? false} />
      </div>
      {tareaId ? (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted">Ya está en tus tareas</span>
          <Link href={`/foco?tarea=${tareaId}`} className="enlace">
            Concentrarme
          </Link>
        </div>
      ) : (
        puedeImportar && (
          <form action={importarDeGoogle} className="flex flex-wrap gap-4">
            <input type="hidden" name="clave" value={claveGoogle(o)} />
            <input type="hidden" name="titulo" value={o.titulo} />
            <input type="hidden" name="fecha" value={o.fecha} />
            <input type="hidden" name="inicio" value={o.horaInicio ?? ""} />
            <input type="hidden" name="fin" value={o.horaFin ?? ""} />
            <button
              type="submit"
              name="destino"
              value="tarea"
              className="enlace text-sm"
            >
              Pasar a tarea
            </button>
            <button
              type="submit"
              name="destino"
              value="foco"
              className="enlace text-sm"
            >
              Concentrarme
            </button>
          </form>
        )
      )}
    </div>
  );
}
