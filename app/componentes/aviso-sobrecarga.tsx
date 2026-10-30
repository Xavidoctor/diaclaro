import Link from "next/link";
import { listarTareas } from "@/lib/data/bandeja";
import type { Ocurrencia } from "@/lib/planner/agenda";
import type { Ajustes } from "@/lib/planner/ajustes";
import { tareasParaHoy } from "@/lib/planner/bandeja";
import { calcularCarga, textoDuracion } from "@/lib/planner/carga";
import { horaEn } from "@/lib/planner/fechas";
import type { RutinaDelDia } from "@/lib/planner/rutinas";

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
  const { atrasadas, deHoy } = tareasParaHoy(await listarTareas(false), hoy);
  const ahora = horaEn(ajustes.timezone);
  const carga = calcularCarga({
    ahora,
    horaLevantarse: ajustes.wake_time,
    horaAcostarse: ajustes.sleep_time,
    tareas: [...atrasadas, ...deHoy],
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

  const { estado, apuntado, libre, diferencia, sinDuracion } = carga;
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
        Te quedan {textoDuracion(apuntado)} por hacer y{" "}
        {textoDuracion(libre)} hasta las {ajustes.sleep_time}, sin contar
        comidas ni descansos.
      </p>
      {sinDuracion.length > 0 && (
        <p className="text-muted">
          {sinDuracion.length === 1
            ? `"${sinDuracion[0]}" no tiene minutos, así que puede ser más.`
            : `${sinDuracion.length} cosas no tienen minutos, así que puede ser más.`}
        </p>
      )}
      {tePasas && (
        <p className="text-muted">
          Puedes pasar alguna tarea a otro día desde su ficha.
        </p>
      )}
    </section>
  );
}
