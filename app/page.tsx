import Link from "next/link";
import { redirect } from "next/navigation";
import {
  cerrarSesion,
  deshacerRutinaHecha,
  marcarRutinaHecha,
} from "@/app/actions";
import { cargarAgendaGoogle } from "@/app/componentes/agenda-google";
import { AvisoGoogle, EtiquetaGoogle } from "@/app/componentes/aviso-google";
import { AvisoSobrecarga } from "@/app/componentes/aviso-sobrecarga";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { CierreDeHoy } from "@/app/componentes/cierre-de-hoy";
import { EmpiezoElDia } from "@/app/componentes/empiezo-el-dia";
import { FocoDeHoy } from "@/app/componentes/foco-de-hoy";
import { PlanDeHoy } from "@/app/componentes/plan-de-hoy";
import { SeguimientosEmpleo } from "@/app/componentes/seguimientos-empleo";
import { TareasDeHoy } from "@/app/componentes/tareas-de-hoy";
import { SaludoLocal } from "@/app/saludo-local";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerInicio } from "@/lib/data/inicio-dia";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import { ocurrenciasEntre, textoHora } from "@/lib/planner/agenda";
import { hoyEn } from "@/lib/planner/fechas";
import { ajustesDelDia } from "@/lib/planner/inicio-dia";
import { juntarAgendas } from "@/lib/planner/google-calendar";
import {
  rutinasDelDia,
  textoFranja,
  type RutinaDelDia,
} from "@/lib/planner/rutinas";
import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  // Hoy: tu agenda, tus tareas y tus rutinas del día.
  const ajustes = await leerAjustes();
  const { timezone } = ajustes;
  const hoy = hoyEn(timezone);
  const [eventos, rutinas, registros, inicio, google] = await Promise.all([
    listarEventosHasta(hoy),
    listarRutinas(),
    listarRegistrosDelDia(hoy),
    leerInicio(hoy),
    cargarAgendaGoogle(hoy, hoy, timezone),
  ]);
  // Si has pulsado "Empiezo el día", el día cuenta desde esa hora.
  const ajustesHoy = ajustesDelDia(ajustes, inicio);
  const excepciones = await listarExcepciones(eventos.map((e) => e.id));
  // Tu agenda de DíaClaro y la de Google Calendar (si la conectaste), juntas.
  const agenda = juntarAgendas(
    ocurrenciasEntre(eventos, excepciones, hoy, hoy),
    google.ocurrencias,
  );
  const deHoy = rutinasDelDia(rutinas, registros, hoy);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            <SaludoLocal />
          </h1>
          <div className="flex gap-4 text-sm text-muted">
            <Link href="/ajustes" className="underline">
              Ajustes
            </Link>
            <form action={cerrarSesion}>
              <button type="submit" className="underline">
                Salir
              </button>
            </form>
          </div>
        </header>

        <EmpiezoElDia inicio={inicio} ajustes={ajustesHoy} rutinas={deHoy} />

        <AvisoSobrecarga
          hoy={hoy}
          ajustes={ajustesHoy}
          agenda={agenda}
          rutinas={deHoy}
        />

        <PlanDeHoy hoy={hoy} />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Apunta algo</h2>
          <CapturaRapida />
        </section>

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Agenda de hoy</h2>
            <Link href="/agenda" className="text-sm underline">
              Ver 14 días
            </Link>
          </header>
          <AvisoGoogle estado={google.estado} />
          {agenda.length === 0 ? (
            <p className="text-sm text-muted">Hoy no tienes nada apuntado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {agenda.map((o) => (
                <li key={`${o.eventoId}|${o.fechaOriginal}`}>
                  {o.google ? (
                    // Lo de Google solo se ve: se cambia en Google Calendar.
                    <div className="card flex items-baseline gap-3 p-4">
                      <span className="w-28 shrink-0 text-sm text-muted">
                        {textoHora(o)}
                      </span>
                      <span className="flex-1 break-words">{o.titulo}</span>
                      <EtiquetaGoogle libre={o.google.libre} />
                    </div>
                  ) : (
                    <Link
                      href={`/agenda/${o.eventoId}?dia=${o.fechaOriginal}`}
                      className="card flex items-baseline gap-3 p-4"
                    >
                      <span className="w-28 shrink-0 text-sm text-muted">
                        {textoHora(o)}
                      </span>
                      <span className="flex-1 break-words">{o.titulo}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <TareasDeHoy hoy={hoy} />

        <SeguimientosEmpleo hoy={hoy} />

        <FocoDeHoy hoy={hoy} />

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Rutinas</h2>
            <Link href="/ajustes" className="text-sm underline">
              Cambiar
            </Link>
          </header>
          {deHoy.length === 0 ? (
            <p className="text-sm text-muted">
              Hoy no toca ninguna. Puedes añadirlas en Ajustes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {deHoy.map((r) => (
                <FilaRutina key={r.rutina.id} item={r} />
              ))}
            </ul>
          )}
        </section>

        <CierreDeHoy hoy={hoy} />

        <p className="text-sm text-muted">
          Has entrado como {data.claims.email}
        </p>
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

function FilaRutina({ item }: { item: RutinaDelDia }) {
  const { rutina, hechas, completa } = item;
  return (
    <li className="card flex items-center gap-3 p-4">
      <div className="flex flex-1 flex-col gap-1">
        <span
          className={`break-words ${completa ? "text-muted line-through" : ""}`}
        >
          {rutina.title}
        </span>
        <span className="text-sm text-muted">
          {hechas} de {rutina.times_per_day}
          {rutina.duration_minutes ? ` · ${rutina.duration_minutes} min` : ""}
          {" · "}
          {textoFranja(rutina)}
        </span>
      </div>
      {hechas > 0 && (
        <form action={deshacerRutinaHecha}>
          <input type="hidden" name="id" value={rutina.id} />
          <button type="submit" className="text-sm text-muted underline">
            Deshacer
          </button>
        </form>
      )}
      {!completa && (
        <form action={marcarRutinaHecha}>
          <input type="hidden" name="id" value={rutina.id} />
          <button type="submit" className="button-primary py-2 text-sm">
            Hecho
          </button>
        </form>
      )}
    </li>
  );
}
