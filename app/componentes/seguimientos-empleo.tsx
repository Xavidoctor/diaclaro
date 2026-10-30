import Link from "next/link";
import { ListaCandidaturas } from "@/app/empleo/lista";
import { listarSeguimientosHasta } from "@/lib/data/candidaturas";
import { seguimientosPendientes } from "@/lib/planner/candidaturas";

// Sección de Hoy con las candidaturas que toca seguir hoy (o que se han pasado).
// Si no hay ninguna (o la tabla aún no existe), no se muestra, para no romper Hoy.
export async function SeguimientosEmpleo({ hoy }: { hoy: string }) {
  let pendientes: Awaited<ReturnType<typeof listarSeguimientosHasta>>;
  try {
    pendientes = seguimientosPendientes(
      await listarSeguimientosHasta(hoy),
      hoy,
    );
  } catch {
    return null;
  }
  if (pendientes.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Seguimientos de empleo</h2>
        <Link href="/empleo" className="enlace text-sm">
          Ver todas
        </Link>
      </header>
      <ListaCandidaturas candidaturas={pendientes} hoy={hoy} />
    </section>
  );
}
