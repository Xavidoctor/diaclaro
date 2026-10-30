import Link from "next/link";
import {
  mesDe,
  nombreMes,
  semanasDelMes,
  sumarMeses,
} from "@/lib/planner/calendario";
import { nombreDia } from "@/lib/planner/fechas";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LETRAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

// El calendario de un mes. Cada día es un enlace: al tocarlo se ve
// abajo lo que tienes ese día. Un puntito marca los días con algo apuntado.
export function CalendarioMes({
  mes,
  hoy,
  elegido,
  diasConAlgo,
  enlace,
}: {
  mes: string; // "2026-11"
  hoy: string;
  elegido: string | null;
  diasConAlgo: Set<string>;
  // Crea la dirección para ver otro mes o elegir un día.
  enlace: (cambio: { mes?: string; dia?: string }) => string;
}) {
  return (
    <section
      id="calendario"
      aria-label="Calendario"
      className="card flex scroll-mt-4 flex-col gap-3 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={enlace({ mes: sumarMeses(mes, -1) })}
          aria-label="Mes anterior"
          className="enlace inline-flex size-11 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <h2 className="font-semibold first-letter:uppercase">
          {nombreMes(mes)}
        </h2>
        <Link
          href={enlace({ mes: sumarMeses(mes, 1) })}
          aria-label="Mes siguiente"
          className="enlace inline-flex size-11 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {LETRAS_SEMANA.map((letra) => (
          <span key={letra} aria-hidden className="text-xs font-semibold text-muted">
            {letra}
          </span>
        ))}
        {semanasDelMes(mes)
          .flat()
          .map((fecha) => {
            const esElegido = fecha === elegido;
            const esHoy = fecha === hoy;
            const fuera = mesDe(fecha) !== mes;
            const conAlgo = diasConAlgo.has(fecha);
            return (
              <Link
                key={fecha}
                href={enlace({ dia: fecha })}
                aria-label={`${nombreDia(fecha)}${esHoy ? ", hoy" : ""}${conAlgo ? ", tiene cosas apuntadas" : ""}`}
                aria-current={esElegido ? "date" : undefined}
                className={[
                  "relative flex h-11 flex-col items-center justify-center rounded-full text-sm",
                  esElegido
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-secondary",
                  !esElegido && esHoy && "font-semibold text-primary ring-2 ring-primary",
                  !esElegido && fuera && "text-muted opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {Number(fecha.slice(8))}
                {conAlgo && (
                  <span
                    aria-hidden
                    className={`absolute bottom-1.5 size-1 rounded-full ${esElegido ? "bg-primary-foreground" : "bg-primary"}`}
                  />
                )}
              </Link>
            );
          })}
      </div>
    </section>
  );
}
