import {
  deshacerInicioDia,
  empezarDia,
} from "@/app/componentes/acciones-inicio";
import { BotonRutinaHecha } from "@/app/componentes/boton-rutina-hecha";
import Link from "next/link";
import { CorregirDormir } from "@/app/componentes/corregir-dormir";
import { CorregirHoras } from "@/app/componentes/corregir-horas";
import type { Ajustes } from "@/lib/planner/ajustes";
import type { NocheParaCorregir } from "@/lib/planner/dormir";
import type { ModoDelDia } from "@/lib/planner/dia-activo";
import { nombreDia } from "@/lib/planner/fechas";
import {
  estadoDespertar,
  primeraRutina,
  type InicioDia,
} from "@/lib/planner/inicio-dia";
import { textoFranja, type RutinaDelDia } from "@/lib/planner/rutinas";
import { SaberMas } from "@/app/componentes/saber-mas";

// Botón «Me he levantado» arriba de Hoy (antes había dos: «Despierto» y
// «Levantado»; Xavi prefirió una sola hora). Al pulsarlo se guarda la hora y el aviso de sobrecarga calcula tu
// día desde ese momento hasta que te acuestes.
// "ajustes" son los de hoy (ya con la hora de acostarte del día, si la pusiste).
// "rutinas" son las de hoy: al levantarte, te enseña la primera (como el primer paseo).
//
// El día no cambia a medianoche (ver lib/planner/dia-activo.ts):
// - "trasnoche": sigues en el día de ayer ("dia") hasta que pulses «Me voy a
//   dormir»; los botones de abajo ya abren el día nuevo.
// - "cerrado": ya te has ido a dormir; los botones abren mañana.
// "inicio" es el del día que abren los botones. "anoche" es la noche anterior
// a ese día: la hora a la que te dormiste (si la hay), la prevista y el motivo.
export function EmpiezoElDia({
  inicio,
  ajustes,
  rutinas,
  modo,
  dia,
  anoche,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
  rutinas: RutinaDelDia[];
  modo: ModoDelDia;
  dia: string;
  anoche: NocheParaCorregir;
}) {
  if (modo === "trasnoche")
    return (
      <section className="card flex flex-col gap-3 p-4">
        <p className="text-sm">
          Sigues en tu día del {nombreDia(dia)}. Termina cuando pulses «Me voy a
          dormir».
        </p>
        <Link href="/dormir" className="button-primary py-2 text-center">
          Me voy a dormir
        </Link>
        <p className="mt-2 text-sm text-muted">
          ¿Ya te has despertado? Empieza el día nuevo:
        </p>
        <BotonesDespertar inicio={inicio} ajustes={ajustes} anoche={anoche} />
      </section>
    );

  if (estadoDespertar(inicio) === "levantado" && inicio?.start_time) {
    const primera = primeraRutina(rutinas);
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 text-sm text-muted">
          <p>
            Te has levantado a las {inicio.start_time}
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
        <CorregirHoras inicio={inicio} />
        {primera && <LoPrimero item={primera} />}
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      {modo === "cerrado" && (
        <p className="text-sm text-muted">
          Día cerrado{anoche.hora ? ` a las ${anoche.hora}` : ""}. ¡Buenas
          noches!{" "}
          <Link href="/dormir" className="underline">
            Deshacer
          </Link>
        </p>
      )}
      <BotonesDespertar inicio={inicio} ajustes={ajustes} anoche={anoche} />
    </section>
  );
}

// El botón, para la tarjeta de Hoy y para la pantalla /despierto.
// "grande" lo hace más alto, para pulsarlo medio dormido.
// "irAHoy": al pulsarlo, te lleva a Hoy.
// "anoche": la noche anterior (para corregir la hora y apuntar el motivo).
export function BotonesDespertar({
  inicio,
  ajustes,
  anoche,
  grande = false,
  irAHoy = false,
}: {
  inicio: InicioDia | null;
  ajustes: Ajustes;
  anoche: NocheParaCorregir;
  grande?: boolean;
  irAHoy?: boolean;
}) {
  const alto = grande ? "min-h-16 text-lg" : "py-2";
  return (
    <>
      <SaberMas resumen="Pulsa «Me he levantado» al empezar el día.">
        Calcularé tu día desde esa hora hasta que te acuestes.
      </SaberMas>
      <form action={empezarDia} className="flex flex-col gap-3">
        {irAHoy && <input type="hidden" name="ir_a_hoy" value="1" />}
        {!ajustes.sleep_time && (
          <label className="flex flex-col gap-1 text-sm">
            ¿A qué hora te acostarás hoy? (puedes dejarlo vacío)
            <input type="time" name="sleep_time" className="input py-2" />
          </label>
        )}
        <button type="submit" className={`button-primary ${alto}`}>
          Me he levantado
        </button>
      </form>
      <CorregirHoras
        inicio={inicio}
        texto="¿Se te olvidó pulsar? Pon la hora a mano"
      />
      <CorregirDormir anoche={anoche} />
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
      <BotonRutinaHecha id={rutina.id} titulo={rutina.title} />
    </div>
  );
}
