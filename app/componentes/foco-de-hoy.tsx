import Link from "next/link";
import { listarSesionesDelDia } from "@/lib/data/foco";
import { textoHoras } from "@/lib/planner/areas";
import { totalMinutos } from "@/lib/planner/foco";

// Sección de Hoy con el tiempo de foco del día y un botón para empezar otro rato.
export async function FocoDeHoy({ hoy }: { hoy: string }) {
  const sesiones = await listarSesionesDelDia(hoy);
  return (
    <section className="card flex items-center justify-between gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Foco</h2>
        <p className="text-sm text-muted">
          {sesiones.length === 0
            ? "Hoy aún no has hecho ningún rato de foco."
            : `Hoy llevas ${textoHoras(totalMinutos(sesiones))} (${
                sesiones.length === 1 ? "1 rato" : `${sesiones.length} ratos`
              }).`}
        </p>
      </div>
      <Link href="/foco" className="button-primary shrink-0 py-2 text-sm">
        Empezar
      </Link>
    </section>
  );
}
