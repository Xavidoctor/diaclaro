import Link from "next/link";
import { deshacerApunte } from "@/app/habitos/actions";
import { Apuntar } from "@/app/habitos/apuntar";
import { listarHabitos, listarRegistrosEntre } from "@/lib/data/habitos";
import { habitosDelDia, textoCantidad } from "@/lib/planner/habitos";

// Sección de Hoy con tus hábitos del día. Si no tienes ninguno activo,
// no sale nada: los hábitos son opcionales.
export async function HabitosDeHoy({ hoy }: { hoy: string }) {
  // Si algo falla (por ejemplo, aún no existe la tabla), Hoy sigue funcionando.
  const datos = await Promise.all([
    listarHabitos(),
    listarRegistrosEntre(hoy, hoy),
  ]).catch(() => null);
  if (!datos) return null;
  const [habitos, registros] = datos;
  const deHoy = habitosDelDia(habitos, registros, hoy);
  if (deHoy.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Hábitos</h2>
        <Link href="/habitos" className="text-sm underline">
          Ver semana
        </Link>
      </header>
      <ul className="flex flex-col gap-2">
        {deHoy.map(({ habito, total }) => (
          <li key={habito.id} className="card flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col gap-1">
              <span className="break-words">{habito.title}</span>
              <span className="text-sm text-muted">
                {total === null
                  ? "Aún nada apuntado"
                  : `Hoy: ${textoCantidad(total, habito.unit)}`}
              </span>
            </div>
            {total !== null && (
              <form action={deshacerApunte}>
                <input type="hidden" name="id" value={habito.id} />
                <button type="submit" className="text-sm text-muted underline">
                  Deshacer
                </button>
              </form>
            )}
            <Apuntar id={habito.id} unidad={habito.unit} conDetalle={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
