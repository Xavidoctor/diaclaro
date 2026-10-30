import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { borrarSesionFoco } from "@/app/foco/actions";
import { Temporizador } from "@/app/foco/temporizador";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarTareas } from "@/lib/data/bandeja";
import { listarSesionesDelDia } from "@/lib/data/foco";
import { textoHoras } from "@/lib/planner/areas";
import { hoyEn } from "@/lib/planner/fechas";
import { totalMinutos } from "@/lib/planner/foco";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Foco" };

// Temporizador de foco: eliges una tarea (o ninguna), pones los minutos y a trabajar.
// Al terminar se guarda el rato de foco. /foco?tarea=<id> empieza con esa tarea elegida.
export default async function FocoPage({ searchParams }: PageProps<"/foco">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const params = await searchParams;
  const tareaInicial = typeof params.tarea === "string" ? params.tarea : null;
  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  const [tareas, sesiones] = await Promise.all([
    listarTareas(false),
    listarSesionesDelDia(hoy),
  ]);
  const pendientes = tareas
    .filter((t) => !t.done_at)
    .map(({ id, title, estimated_minutes }) => ({
      id,
      title,
      estimated_minutes,
    }));
  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Foco</h1>
          <p className="text-sm text-muted">
            Un rato para una sola cosa, sin distracciones. Cuando acabe, te
            aviso.
          </p>
        </header>

        <Temporizador tareas={pendientes} tareaInicial={tareaInicial} />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Hoy llevas {textoHoras(totalMinutos(sesiones))} de foco
          </h2>
          {sesiones.length === 0 ? (
            <p className="text-sm text-muted">
              Aún no has guardado ningún rato de foco hoy.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sesiones.map((s) => (
                <li key={s.id} className="card flex items-center gap-3 p-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="break-words">
                      {s.tasks?.title ?? "Sin tarea concreta"}
                    </span>
                    <span className="text-sm text-muted">
                      {hora.format(new Date(s.started_at))} · {s.minutes} min
                      {s.planned_minutes && s.planned_minutes !== s.minutes
                        ? ` (de ${s.planned_minutes})`
                        : ""}
                    </span>
                  </div>
                  <form action={borrarSesionFoco}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-sm text-muted underline">
                      Borrar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BarraInferior actual="/foco" />
    </>
  );
}
