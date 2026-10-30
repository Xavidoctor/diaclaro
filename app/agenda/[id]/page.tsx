import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelarDia,
  deshacerCambioDia,
  eliminarEvento,
} from "@/app/agenda/actions";
import { CambioDia } from "@/app/agenda/cambio-dia";
import { FormEvento } from "@/app/agenda/form-evento";
import { leerEvento, leerExcepcion } from "@/lib/data/agenda";
import {
  describirRepeticion,
  leerRegla,
  tocaEseDia,
} from "@/lib/planner/agenda";
import { esFecha, nombreDia } from "@/lib/planner/fechas";

export const metadata: Metadata = { title: "Evento" };

// Ficha de un evento. Si llegas desde un día de la agenda (?dia=2026-10-28)
// y el evento se repite, puedes cambiar solo ese día.
export default async function EventoPage({
  params,
  searchParams,
}: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  const { dia } = await searchParams;
  const evento = await leerEvento(id);
  if (!evento) notFound();

  const diaValido =
    typeof dia === "string" &&
    esFecha(dia) &&
    evento.repeat_rule !== null &&
    tocaEseDia(evento, dia)
      ? dia
      : null;
  const excepcion = diaValido
    ? await leerExcepcion(evento.id, diaValido)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href={diaValido ? `/agenda?desde=${diaValido}` : "/agenda"}
        className="text-sm underline"
      >
        ← Agenda
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          {evento.title}
        </h1>
        <p className="text-sm text-muted">
          {describirRepeticion(leerRegla(evento.repeat_rule))}
        </p>
      </header>

      {diaValido && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold first-letter:uppercase">
            Solo el {nombreDia(diaValido)}
          </h2>
          {excepcion?.cancelled ? (
            <>
              <p className="text-muted">Este día está cancelado.</p>
              <BotonDia
                accion={deshacerCambioDia}
                id={evento.id}
                dia={diaValido}
              >
                Deshacer la cancelación
              </BotonDia>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Cambia este día sin tocar los demás. Por ejemplo, si esta semana
                pasa a otro día o a otra hora.
              </p>
              <CambioDia
                id={evento.id}
                dia={diaValido}
                nuevoDia={excepcion?.new_date ?? diaValido}
                horaInicio={
                  excepcion ? excepcion.new_start_time : evento.start_time
                }
                horaFin={excepcion ? excepcion.new_end_time : evento.end_time}
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <BotonDia
                  accion={cancelarDia}
                  id={evento.id}
                  dia={diaValido}
                  peligro
                >
                  Cancelar solo este día
                </BotonDia>
                {excepcion && (
                  <BotonDia
                    accion={deshacerCambioDia}
                    id={evento.id}
                    dia={diaValido}
                  >
                    Volver a como era
                  </BotonDia>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {evento.repeat_rule ? "Todos los días" : "Datos"}
        </h2>
        <FormEvento evento={evento} diaInicial={evento.start_date} />
      </section>

      <form action={eliminarEvento} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={evento.id} />
        <details>
          <summary className="cursor-pointer text-sm text-danger">
            Borrar este evento
          </summary>
          <p className="mt-2 text-sm text-muted">
            {evento.repeat_rule
              ? "Se borran todos sus días y sus cambios. No se puede deshacer."
              : "No se puede deshacer."}
          </p>
          <button type="submit" className="mt-2 text-sm text-danger underline">
            Sí, borrarlo
          </button>
        </details>
      </form>
    </main>
  );
}

function BotonDia({
  accion,
  id,
  dia,
  peligro,
  children,
}: {
  accion: (formData: FormData) => Promise<void>;
  id: string;
  dia: string;
  peligro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={accion}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dia" value={dia} />
      <button
        type="submit"
        className={`text-left underline ${peligro ? "text-danger" : ""}`}
      >
        {children}
      </button>
    </form>
  );
}
