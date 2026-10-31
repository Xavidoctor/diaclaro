import { textoDuracion } from "@/lib/planner/carga";
import type { HorasDelDia } from "@/lib/planner/horas-del-dia";

// Barra de las horas de un día: lo que ya ha pasado (gris claro), lo
// ocupado y lo libre. Si el día está casi lleno (80 % o más), la parte
// ocupada se pone de un rojizo suave. Sin textos de aviso: solo el color.
// El cálculo está en lib/planner/horas-del-dia.ts.
export function BarraHorasDia({
  horas,
  esHoy,
}: {
  horas: HorasDelDia;
  esHoy: boolean;
}) {
  const { total, pasado, quedan, lleno } = horas;
  if (total <= 0) return null;
  // Lo ocupado nunca se dibuja más largo que lo que queda.
  const ocupado = Math.min(horas.ocupado, quedan);
  const ancho = (minutos: number) => `${(minutos / total) * 100}%`;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div
        role="img"
        aria-label={`${textoDuracion(horas.ocupado)} ocupadas y ${textoDuracion(horas.libre)} libres`}
        className="flex h-2 overflow-hidden rounded-full bg-secondary"
      >
        {pasado > 0 && (
          <div className="bg-border" style={{ width: ancho(pasado) }} />
        )}
        {ocupado > 0 && (
          <div
            className={lleno ? "bg-danger/60" : "bg-primary"}
            style={{ width: ancho(ocupado) }}
          />
        )}
      </div>
      <p className="text-muted">
        {textoDuracion(horas.ocupado)} ocupadas ·{" "}
        {textoDuracion(horas.libre)} libres
        {esHoy
          ? ` · te quedan ${textoDuracion(quedan)} despierto`
          : ` de ${textoDuracion(total)}`}
      </p>
    </div>
  );
}
