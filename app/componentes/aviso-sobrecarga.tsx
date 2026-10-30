import Link from "next/link";
import { aplicarRecortes } from "@/app/componentes/acciones-recortes";
import { ExplicarConIA } from "@/app/componentes/explicar-con-ia";
import { calcularSituacion } from "@/app/componentes/situacion-hoy";
import { iaDisponible } from "@/lib/ai/groq";
import type { Ocurrencia } from "@/lib/planner/agenda";
import type { Ajustes } from "@/lib/planner/ajustes";
import { textoDuracion } from "@/lib/planner/carga";
import {
  textoRecorte,
  type PropuestaRecortes,
  type Recorte,
} from "@/lib/planner/recortes";
import type { RutinaDelDia } from "@/lib/planner/rutinas";
import { textoFactor } from "@/lib/planner/tiempos";

// Tarjeta de Hoy que te dice si lo que te queda por hacer cabe en el tiempo
// que te queda hasta acostarte. El cálculo está en lib/planner/carga.ts.
export async function AvisoSobrecarga({
  hoy,
  ajustes,
  agenda,
  rutinas,
}: {
  hoy: string;
  ajustes: Ajustes;
  agenda: Ocurrencia[];
  rutinas: RutinaDelDia[];
}) {
  const { carga, factores, propuesta } = await calcularSituacion({
    hoy,
    ajustes,
    agenda,
    rutinas,
  });

  if (carga.estado === "falta-hora-acostarse") {
    return (
      <section className="card flex flex-col gap-1 p-4 text-sm">
        <p>
          Para avisarte si hoy te pasas con lo que tienes que hacer, necesito
          saber a qué hora sueles acostarte.
        </p>
        <Link href="/ajustes" className="underline">
          Ponerla en Ajustes
        </Link>
      </section>
    );
  }

  const { estado, apuntado, libre, diferencia, sinDuracion, ajuste } = carga;
  const tePasas = estado === "te-pasas";

  return (
    <section
      className={`card flex flex-col gap-1 p-4 text-sm ${
        tePasas ? "border-danger" : ""
      }`}
    >
      <p className={`font-semibold ${tePasas ? "text-danger" : ""}`}>
        {tePasas
          ? `Hoy te pasas unas ${textoDuracion(diferencia)}`
          : `Te cabe lo de hoy (te sobran ${textoDuracion(diferencia)})`}
      </p>
      <p className="text-muted">
        Te quedan {textoDuracion(apuntado)} por hacer y {textoDuracion(libre)}{" "}
        hasta las {ajustes.sleep_time}, sin contar comidas ni descansos.
      </p>
      {ajuste !== 0 && factores.tarea && (
        <p className="text-muted">
          Ya cuenta que sueles tardar {textoFactor(factores.tarea)} (según tus
          últimas {factores.tarea.muestras} tareas).
        </p>
      )}
      {ajuste !== 0 && !factores.tarea && factores.entrega && (
        <p className="text-muted">
          Ya cuenta que en las entregas sueles tardar{" "}
          {textoFactor(factores.entrega)}.
        </p>
      )}
      {sinDuracion.length > 0 && (
        <p className="text-muted">
          {sinDuracion.length === 1
            ? `"${sinDuracion[0]}" no tiene minutos, así que puede ser más.`
            : `${sinDuracion.length} cosas no tienen minutos, así que puede ser más.`}
        </p>
      )}
      {propuesta && <Recortes propuesta={propuesta} />}
      {iaDisponible() && <ExplicarConIA />}
    </section>
  );
}

// Texto que viaja en el botón: "id|aplazar|2026-10-31" o "id|acortar|45".
function valorRecorte(r: Recorte) {
  return r.tipo === "aplazar"
    ? `${r.tareaId}|aplazar|${r.nuevaFecha}`
    : `${r.tareaId}|acortar|${r.nuevosMinutos}`;
}

// Lo que la app propone recortar. Nada cambia hasta que pulsas "Aceptar".
function Recortes({ propuesta }: { propuesta: PropuestaRecortes }) {
  const { recortes, faltan } = propuesta;
  if (recortes.length === 0) {
    return (
      <p className="text-muted">
        No veo nada que recortar sin tocar lo importante. Marca la importancia
        de tus tareas en su ficha para que pueda proponerte recortes.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="font-semibold">Para que salga lo importante, podrías:</p>
      <ul className="flex flex-col gap-2">
        {recortes.map((r) => (
          <li
            key={r.tareaId}
            className="flex items-center gap-3 rounded-xl border border-border p-3"
          >
            <div className="flex flex-1 flex-col">
              <span className="break-words">{r.titulo}</span>
              <span className="text-muted">
                {textoRecorte(r, textoDuracion)} · {r.motivo}
              </span>
            </div>
            <form action={aplicarRecortes}>
              <input type="hidden" name="recorte" value={valorRecorte(r)} />
              <button type="submit" className="underline">
                Aceptar
              </button>
            </form>
          </li>
        ))}
      </ul>
      {faltan > 0 && (
        <p className="text-muted">
          Aun así te faltarían {textoDuracion(faltan)}: lo que queda es
          importante o tiene fecha que no se puede mover.
        </p>
      )}
      {recortes.length > 1 && (
        <form action={aplicarRecortes}>
          {recortes.map((r) => (
            <input
              key={r.tareaId}
              type="hidden"
              name="recorte"
              value={valorRecorte(r)}
            />
          ))}
          <button type="submit" className="button-primary py-2 text-sm">
            Aceptar todos
          </button>
        </form>
      )}
    </div>
  );
}
