import Link from "next/link";
import { leerCierre } from "@/lib/data/cierre";
import { sumarDias } from "@/lib/planner/fechas";

// Tarjeta al final de Hoy: lo que ayer dijiste que cambiarías y el acceso al cierre del día.
export async function CierreDeHoy({ hoy }: { hoy: string }) {
  const [deAyer, deHoy] = await Promise.all([
    leerCierre(sumarDias(hoy, -1)),
    leerCierre(hoy),
  ]);

  return (
    <section className="card flex flex-col gap-3 p-4">
      {deAyer?.change_tomorrow && (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Ayer querías cambiar
          </h2>
          <p className="whitespace-pre-wrap break-words">
            {deAyer.change_tomorrow}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Cierre del día</h2>
          <p className="text-sm text-muted">
            {deHoy
              ? "Ya has cerrado el día. Puedes cambiarlo."
              : "¿Qué has conseguido hoy y qué cambias mañana?"}
          </p>
        </div>
        <Link href="/cierre" className="button-primary shrink-0 py-2 text-sm">
          {deHoy ? "Ver" : "Cerrar el día"}
        </Link>
      </div>
    </section>
  );
}
