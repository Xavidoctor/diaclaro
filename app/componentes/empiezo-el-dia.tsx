import {
  deshacerInicioDia,
  empezarDia,
} from "@/app/componentes/acciones-inicio";
import type { Ajustes } from "@/lib/planner/ajustes";
import type { InicioDia } from "@/lib/planner/inicio-dia";

// Botón "Empiezo el día" arriba de Hoy. Al pulsarlo se guarda la hora y el
// aviso de sobrecarga calcula tu día desde ese momento hasta que te acuestes.
// "ajustes" son los de hoy (ya con la hora de acostarte del día, si la pusiste).
export function EmpiezoElDia({
  inicio,
  ajustes,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
}) {
  if (inicio) {
    return (
      <section className="flex items-baseline justify-between gap-4 text-sm text-muted">
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
