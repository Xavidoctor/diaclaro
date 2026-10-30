import {
  deshacerInicioDia,
  empezarDia,
  marcarDespierto,
} from "@/app/componentes/acciones-inicio";
import { marcarRutinaHecha } from "@/app/actions";
import { CorregirHoras } from "@/app/componentes/corregir-horas";
import type { Ajustes } from "@/lib/planner/ajustes";
import {
  estadoDespertar,
  minutosEnLaCama,
  primeraRutina,
  textoEnLaCama,
  type InicioDia,
} from "@/lib/planner/inicio-dia";
import { textoFranja, type RutinaDelDia } from "@/lib/planner/rutinas";
import { SaberMas } from "@/app/componentes/saber-mas";

// Botones "Despierto" y "Levantado" arriba de Hoy (antes "Empiezo el día").
// Al pulsar "Levantado" se guarda la hora y el aviso de sobrecarga calcula tu
// día desde ese momento hasta que te acuestes.
// "ajustes" son los de hoy (ya con la hora de acostarte del día, si la pusiste).
// "rutinas" son las de hoy: al levantarte, te enseña la primera (como el primer paseo).
export function EmpiezoElDia({
  inicio,
  ajustes,
  rutinas,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
  rutinas: RutinaDelDia[];
}) {
  if (estadoDespertar(inicio) === "levantado" && inicio?.start_time) {
    const primera = primeraRutina(rutinas);
    const enLaCama = textoEnLaCama(minutosEnLaCama(inicio));
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 text-sm text-muted">
          <p>
            Te has levantado a las {inicio.start_time}
            {ajustes.sleep_time
              ? ` · te acuestas a las ${ajustes.sleep_time}`
              : ""}
            .{enLaCama ? ` ${enLaCama}` : ""}
          </p>
          <form action={deshacerInicioDia}>
            <button type="submit" className="underline">
              Deshacer
            </button>
          </form>
        </div>
        <CorregirHoras inicio={inicio} />
        {primera && <LoPrimero item={primera} />}
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <BotonesDespertar inicio={inicio} ajustes={ajustes} />
    </section>
  );
}

// Los dos botones, para la tarjeta de Hoy y para la pantalla /despierto.
// "grande" los hace más altos, para pulsarlos medio dormido.
// "irAHoy": al pulsar "Levantado", te lleva a Hoy.
export function BotonesDespertar({
  inicio,
  ajustes,
  grande = false,
  irAHoy = false,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
  grande?: boolean;
  irAHoy?: boolean;
}) {
  const estado = estadoDespertar(inicio);
  const alto = grande ? "min-h-16 text-lg" : "py-2";
  return (
    <>
      {estado === "despierto" && inicio?.awake_time ? (
        <p className="text-sm text-muted">
          {`Despierto desde las ${inicio.awake_time}. Pulsa «Levantado» cuando salgas de la cama.`}
        </p>
      ) : (
        <SaberMas resumen="Pulsa «Despierto» al abrir los ojos y «Levantado» al salir de la cama.">
          Calcularé tu día desde que te levantes hasta que te acuestes.
        </SaberMas>
      )}
      {estado === "sin-empezar" && (
        <form action={marcarDespierto} className="flex flex-col">
          <button type="submit" className={`button-secondary ${alto}`}>
            Despierto
          </button>
        </form>
      )}
      <form action={empezarDia} className="flex flex-col gap-3">
        {irAHoy && <input type="hidden" name="ir_a_hoy" value="1" />}
        {!ajustes.sleep_time && (
          <label className="flex flex-col gap-1 text-sm">
            ¿A qué hora te acostarás hoy? (puedes dejarlo vacío)
            <input type="time" name="sleep_time" className="input py-2" />
          </label>
        )}
        <button type="submit" className={`button-primary ${alto}`}>
          Levantado
        </button>
      </form>
      {estado === "despierto" && (
        <form
          action={deshacerInicioDia}
          className="self-start text-sm text-muted"
        >
          <button type="submit" className="underline">
            Deshacer
          </button>
        </form>
      )}
      <CorregirHoras
        inicio={inicio}
        texto={
          estado === "despierto"
            ? "Cambiar horas"
            : "¿Se te olvidó pulsar? Pon la hora a mano"
        }
      />
    </>
  );
}

// "Lo primero: Paseo del perro · 15 min · por la mañana", con su botón Hecho.
function LoPrimero({ item }: { item: RutinaDelDia }) {
  const { rutina } = item;
  return (
    <div className="card flex items-center gap-3 bg-secondary p-4">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
