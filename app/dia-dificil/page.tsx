import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { aceptarDiaDificil, aceptarUnCambio } from "@/app/dia-dificil/actions";
import { ContarConIA, ExplicarDiaConIA } from "@/app/dia-dificil/ayuda-ia";
import { cargarDiaDificil } from "@/app/dia-dificil/situacion";
import { iaDisponible } from "@/lib/ai/groq";
import { textoHora } from "@/lib/planner/agenda";
import { textoDuracion } from "@/lib/planner/carga";
import { leerMotivo, MOTIVOS, type Motivo } from "@/lib/planner/dia-dificil";
import { fechaCorta } from "@/lib/planner/fechas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Día difícil" };

// Día difícil: eliges el motivo y la app te propone qué conservar, qué
// reducir y qué aplazar. Nada cambia hasta que pulsas "Aceptar". Al aceptar,
// se apunta que hoy es un día difícil y lo que conservas, para el cierre del día.
// La lógica está en lib/planner/dia-dificil.ts.
export default async function DiaDificilPage({
  searchParams,
}: PageProps<"/dia-dificil">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const motivo = leerMotivo((await searchParams).motivo);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-1">
          <Link href="/" className="text-sm text-muted underline">
            Volver a Hoy
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Día difícil</h1>
          <p className="text-sm text-muted">
            Pasa. Vamos a quedarnos con lo que de verdad importa hoy.
          </p>
        </header>
        {motivo ? <Propuesta motivo={motivo} /> : <ElegirMotivo />}
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

function ElegirMotivo() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">¿Qué ha pasado?</h2>
      <ul className="flex flex-col gap-2">
        {(Object.keys(MOTIVOS) as Motivo[]).map((m) => (
          <li key={m}>
            <Link href={`/dia-dificil?motivo=${m}`} className="card block p-4">
              {MOTIVOS[m]}
            </Link>
          </li>
        ))}
      </ul>
      {iaDisponible() && <ContarConIA />}
    </section>
  );
}

async function Propuesta({ motivo }: { motivo: Motivo }) {
  const { agenda, pendientes, propuesta } = await cargarDiaDificil(motivo);
  const { conservar, reducir, aplazar, ahorro } = propuesta;

  // Texto que viaja en cada botón, en el formato de aplicarRecortes.
  const cambios = [
    ...reducir.map((r) => `${r.tarea.id}|acortar|${r.nuevosMinutos}`),
    ...aplazar.map((a) => `${a.tarea.id}|aplazar|${a.nuevaFecha}`),
  ];
  // Viaja con cada botón para apuntar que hoy es un día difícil y qué conservas.
  const ocultos = (
    <>
      <input type="hidden" name="motivo" value={motivo} />
      {conservar.map((c) => (
        <input
          key={c.tarea.id}
          type="hidden"
          name="conservar"
          value={c.tarea.id}
        />
      ))}
    </>
  );
  const nadaQueTocar =
    conservar.length === 0 && agenda.length === 0 && pendientes.length === 0;

  return (
    <>
      <p className="text-sm">
        Motivo: <strong>{MOTIVOS[motivo]}</strong>.{" "}
        <Link href="/dia-dificil" className="text-muted underline">
          Cambiar
        </Link>
      </p>
      {iaDisponible() && <ExplicarDiaConIA motivo={motivo} />}

      <Columna titulo="Conservar" vacia={nadaQueTocar}>
        {agenda.map((o) => (
          <Fila
            key={`${o.eventoId}|${o.fechaOriginal}`}
            titulo={o.titulo}
            detalle={`Agenda · ${textoHora(o)}`}
          />
        ))}
        {pendientes.map(({ rutina, hechas }) => (
          <Fila
            key={rutina.id}
            titulo={rutina.title}
            detalle={`Rutina · te quedan ${rutina.times_per_day - hechas}`}
          />
        ))}
        {conservar.map((c) => (
          <Fila key={c.tarea.id} titulo={c.tarea.title} detalle={c.motivo} />
        ))}
      </Columna>

      <Columna titulo="Reducir" vacia={reducir.length === 0}>
        {reducir.map((r) => (
          <Fila
            key={r.tarea.id}
            titulo={r.tarea.title}
            detalle={`De ${textoDuracion(r.tarea.estimated_minutes ?? 0)} a ${textoDuracion(r.nuevosMinutos)}${
              r.ahorro > 0 ? ` (libera ${textoDuracion(r.ahorro)})` : ""
            }`}
            cambio={`${r.tarea.id}|acortar|${r.nuevosMinutos}`}
            ocultos={ocultos}
          />
        ))}
      </Columna>

      <Columna titulo="Aplazar" vacia={aplazar.length === 0}>
        {aplazar.map((a) => (
          <Fila
            key={a.tarea.id}
            titulo={a.tarea.title}
            detalle={`A mañana, ${fechaCorta(a.nuevaFecha)}${
              a.ahorro > 0 ? ` (libera ${textoDuracion(a.ahorro)})` : ""
            }`}
            cambio={`${a.tarea.id}|aplazar|${a.nuevaFecha}`}
            ocultos={ocultos}
          />
        ))}
      </Columna>

      {cambios.length > 0 ? (
        <section className="flex flex-col gap-2">
          {ahorro > 0 && (
            <p className="text-sm text-muted">
              Si aceptas todo, hoy te quitas unas {textoDuracion(ahorro)}.
            </p>
          )}
          <form action={aceptarDiaDificil}>
            {ocultos}
            {cambios.map((c) => (
              <input key={c} type="hidden" name="recorte" value={c} />
            ))}
            <button type="submit" className="button-primary py-2 text-sm">
              Aceptar todo
            </button>
          </form>
          <p className="text-sm text-muted">
            ¿Prefieres otra cosa? Acepta solo lo que quieras, o cambia la tarea
            desde su ficha en la Bandeja.
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted">
          No hay nada que reducir ni aplazar: hoy ya solo tienes lo esencial.
        </p>
      )}
    </>
  );
}

function Columna({
  titulo,
  vacia,
  children,
}: {
  titulo: string;
  vacia: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {vacia ? (
        <p className="text-sm text-muted">Nada.</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

// Una fila. Si trae "cambio", lleva su botón "Aceptar" para aplicarlo solo.
function Fila({
  titulo,
  detalle,
  cambio,
  ocultos,
}: {
  titulo: string;
  detalle: string;
  cambio?: string;
  ocultos?: ReactNode;
}) {
  return (
    <li className="card flex items-center gap-3 p-3 text-sm">
      <div className="flex flex-1 flex-col">
        <span className="break-words">{titulo}</span>
        <span className="text-muted">{detalle}</span>
      </div>
      {cambio && (
        <form action={aceptarUnCambio}>
          <input type="hidden" name="recorte" value={cambio} />
          {ocultos}
          <button type="submit" className="underline">
            Aceptar
          </button>
        </form>
      )}
    </li>
  );
}
