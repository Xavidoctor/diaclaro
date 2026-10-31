import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { EnlaceVolver } from "@/app/componentes/enlace-volver";
import { SaberMas } from "@/app/componentes/saber-mas";
import { aceptarPlan } from "@/app/organizar/actions";
import { cargarOrganizar } from "@/app/organizar/situacion";
import { textoDuracion } from "@/lib/planner/carga";
import { durmioPoco, MAX_OCUPACION } from "@/lib/planner/organizar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Organízame el día" };

// «Organízame el día»: tu asistente coloca tu tarea principal y 2 más en los
// huecos libres de hoy. Nada cambia hasta que pulsas «Aceptar el plan».
// /organizar?ligero=1 hace un plan solo con la principal.
// La lógica está en lib/planner/organizar.ts (sin IA).
export default async function OrganizarPage({
  searchParams,
}: PageProps<"/organizar">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const ligero = (await searchParams).ligero === "1";
  const { propuesta, sueno, quedan } = await cargarOrganizar(ligero);
  const poco = durmioPoco(sueno);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <EnlaceVolver href="/">Hoy</EnlaceVolver>
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Organízame el día
          </h1>
          <SaberMas resumen="Coloco lo más importante en tus huecos libres.">
            Tu tarea principal y 2 más (o solo la principal en un día ligero),
            con lo que sueles tardar de verdad y 10 minutos de respiro entre una
            y otra. Nunca lleno más del {Math.round(MAX_OCUPACION * 100)} % de
            tu tiempo libre. Nada cambia hasta que pulses «Aceptar el plan».
          </SaberMas>
        </header>

        {poco && !ligero && (
          <p className="card text-sm">
            Anoche dormiste unas {textoDuracion(sueno!)}. Si quieres, hago un
            plan más ligero, solo con lo principal.{" "}
            <Link href="/organizar?ligero=1" className="enlace">
              Plan ligero
            </Link>
          </p>
        )}
        {ligero && (
          <p className="text-sm text-muted">
            Plan ligero: solo lo principal.{" "}
            <Link href="/organizar" className="enlace">
              Ver el plan normal
            </Link>
          </p>
        )}

        {!propuesta ? (
          <p className="card text-sm">
            Para saber cuánto día te queda, pon tu hora de acostarte en{" "}
            <Link href="/ajustes" className="enlace">
              Ajustes
            </Link>
            .
          </p>
        ) : quedan === 0 ? (
          <p className="card text-sm">
            No tienes tareas sin hora para hoy. Ponle la fecha de hoy a alguna
            en{" "}
            <Link href="/bandeja?pestana=tareas" className="enlace">
              Tareas
            </Link>{" "}
            y te la coloco.
          </p>
        ) : (
          <>
            {propuesta.bloques.length > 0 ? (
              <form action={aceptarPlan} className="flex flex-col gap-3">
                <ol className="flex flex-col gap-2">
                  {propuesta.bloques.map((b) => (
                    <li
                      key={b.tarea.id}
                      className="card flex items-baseline gap-3 p-4"
                    >
                      <input
                        type="hidden"
                        name="bloque"
                        value={`${b.tarea.id}|${b.inicio}`}
                      />
                      <span className="w-28 shrink-0 text-sm text-muted">
                        {b.inicio}–{b.fin}
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="break-words">{b.tarea.title}</span>
                        {b.minutos !== b.previstos && (
                          <span className="text-xs text-muted">
                            Pusiste {textoDuracion(b.previstos)}; reservo{" "}
                            {textoDuracion(b.minutos)} por lo que sueles tardar.
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
                <button type="submit" className="button-primary self-start">
                  Aceptar el plan
                </button>
                <p className="text-xs text-muted">
                  Al aceptar, cada tarea queda con su hora de hoy. Puedes
                  cambiarla luego en la tarea.
                </p>
              </form>
            ) : (
              <p className="card text-sm">
                Hoy no me cabe ninguna de tus tareas principales en los huecos
                libres.
              </p>
            )}

            {propuesta.sinMinutos.length > 0 && (
              <Aviso titulo="Sin duración, no las coloco">
                {propuesta.sinMinutos.map((t) => t.title).join(", ")}. Ponles
                los minutos en la tarea y vuelve aquí.
              </Aviso>
            )}
            {propuesta.noCaben.length > 0 && (
              <Aviso titulo="No caben hoy sin llenar el día">
                {propuesta.noCaben.map((t) => t.title).join(", ")}. Si hoy va
                justo,{" "}
                <Link href="/dia-dificil" className="enlace">
                  Día difícil
                </Link>{" "}
                te ayuda a decidir qué mover.
              </Aviso>
            )}
            {propuesta.sinFin.length > 0 && (
              <Aviso titulo="Sin hora de fin">
                {propuesta.sinFin.join(", ")}: no sé cuánto dura, así que solo
                evito empezar algo encima de su hora de inicio. Revisa que no se
                pise.
              </Aviso>
            )}
          </>
        )}
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

function Aviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 text-sm">
      <h2 className="font-semibold">{titulo}</h2>
      <p className="text-muted">{children}</p>
    </section>
  );
}
