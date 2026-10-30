import {
  deshacerInicioDia,
  empezarDia,
} from "@/app/componentes/acciones-inicio";
import { marcarRutinaHecha } from "@/app/actions";
import type { Ajustes } from "@/lib/planner/ajustes";
import { primeraRutina, type InicioDia } from "@/lib/planner/inicio-dia";
import { textoFranja, type RutinaDelDia } from "@/lib/planner/rutinas";

// Botón "Empiezo el día" arriba de Hoy. Al pulsarlo se guarda la hora y el
// aviso de sobrecarga calcula tu día desde ese momento hasta que te acuestes.
// "ajustes" son los de hoy (ya con la hora de acostarte del día, si la pusiste).
// "rutinas" son las de hoy: al empezar, te enseña la primera (como el primer paseo).
export function EmpiezoElDia({
  inicio,
  ajustes,
  rutinas,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
  rutinas: RutinaDelDia[];
}) {
  if (inicio) {
    const primera = primeraRutina(rutinas);
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 text-sm text-muted">
          <p>
            Has empezado el día a las {inicio.start_time}
            {ajustes.sleep_time
              ? ` · te acuestas a las ${ajustes.sleep_time}`
              : ""}
            .
          </p>
          <form action={deshacerInicioDia}>
            <button type="submit" className="underline">
              Deshacer
            </button>
          </form>
        </div>
        {primera && <LoPrimero item={primera} />}
      </section>
    );
  }

  return (
    <form action={empezarDia} className="card flex flex-col gap-3 p-4">
      <p className="text-sm text-muted">
        Púlsalo al levantarte: calcularé tu día desde ese momento hasta que te
        acuestes.
      </p>
      {!ajustes.sleep_time && (
        <label className="flex flex-col gap-1 text-sm">
          ¿A qué hora te acostarás hoy? (puedes dejarlo vacío)
          <input type="time" name="sleep_time" className="input py-2" />
        </label>
      )}
      <button type="submit" className="button-primary self-start py-2">
        Empiezo el día
      </button>
    </form>
  );
}

// "Lo primero: Paseo del perro · 15 min · por la mañana", con su botón Hecho.
function LoPrimero({ item }: { item: RutinaDelDia }) {
  const { rutina } = item;
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">
          Lo primero
        </span>
        <span className="break-words">{rutina.title}</span>
        <span className="text-sm text-muted">
          {rutina.duration_minutes ? `${rutina.duration_minutes} min · ` : ""}
          {textoFranja(rutina)}
        </span>
      </div>
      <form action={marcarRutinaHecha}>
        <input type="hidden" name="id" value={rutina.id} />
        <button type="submit" className="button-primary py-2 text-sm">
          Hecho
        </button>
      </form>
    </div>
  );
}
