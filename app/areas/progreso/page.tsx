import { redirect } from "next/navigation";
import { leerFechaParam } from "@/lib/planner/agenda";

// «Tu progreso» ahora vive dentro de «Tu semana» (en la parte «Tus horas»).
// Esta dirección se queda para que los enlaces viejos sigan funcionando.
export default async function ProgresoPage({
  searchParams,
}: PageProps<"/areas/progreso">) {
  const { semana } = await searchParams;
  const dia = leerFechaParam(semana, "");
  redirect(dia ? `/areas/semana?semana=${dia}#horas` : "/areas/semana#horas");
}
