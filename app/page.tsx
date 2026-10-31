import Link from "next/link";
import { redirect } from "next/navigation";
import { deshacerRutinaHecha, marcarRutinaHecha } from "@/app/actions";
import { AyudaPantalla } from "@/app/componentes/ayuda-guia";
import { cargarAgendaGoogle } from "@/app/componentes/agenda-google";
import { AvisoDemo } from "@/app/componentes/aviso-demo";
import { AvisoGoogle, EtiquetaGoogle } from "@/app/componentes/aviso-google";
import { AvisoSobrecarga } from "@/app/componentes/aviso-sobrecarga";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { CapturaRapida } from "@/app/componentes/captura-rapida";
import { CierreDeHoy } from "@/app/componentes/cierre-de-hoy";
import { EmpiezoElDia } from "@/app/componentes/empiezo-el-dia";
import { HabitosDeHoy } from "@/app/componentes/habitos-de-hoy";
import { MetasProximas } from "@/app/componentes/metas-proximas";
import { PlanDeHoy } from "@/app/componentes/plan-de-hoy";
import { iaDisponible } from "@/lib/ai/groq";
import { RecordatoriosHabitos } from "@/app/componentes/recordatorios-habitos";
import { SeguimientosEmpleo } from "@/app/componentes/seguimientos-empleo";
import { TareasDeHoy } from "@/app/componentes/tareas-de-hoy";
import { SaludoLocal } from "@/app/saludo-local";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerInicio } from "@/lib/data/inicio-dia";
import { leerPerfil } from "@/lib/data/perfil";
import { leerSecciones } from "@/lib/data/secciones";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import { ocurrenciasEntre, textoHora } from "@/lib/planner/agenda";
import { ajustesDelDia } from "@/lib/planner/inicio-dia";
import { juntarAgendas } from "@/lib/planner/google-calendar";
import {
  filasDeHoy,
  nombreVez,
  rutinasDelDia,
  textoFranja,
  type FilaRutinaHoy,
} from "@/lib/planner/rutinas";
import { createClient } from "@/lib/supabase/server";
import { leerDiaDeHoy } from "@/lib/data/dia-activo";
import { listarHorasDormir } from "@/lib/data/dormir";
import { sumarDias } from "@/lib/planner/fechas";

export default async function HoyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  // Hoy: tu agenda, tus tareas y tus rutinas del día.
  const ajustes = await leerAjustes();
  const { timezone } = ajustes;
  // El día no cambia a medianoche: empieza al pulsar «Despierto» o
  // «Levantado» y acaba al pulsar «Me voy a dormir».
  const diaActivo = await leerDiaDeHoy();
  const hoy = diaActivo.dia;
  const [eventos, rutinas, registros, inicio, google, perfil, secciones] =
    await Promise.all([
      listarEventosHasta(hoy),
      listarRutinas(),
      listarRegistrosDelDia(hoy),
      leerInicio(hoy),
      cargarAgendaGoogle(hoy, hoy, timezone),
      leerPerfil(),
      leerSecciones(),
    ]);
  // La tarjeta de la mañana va con el día que abren sus botones (de
  // trasnoche, el día nuevo) y con la hora a la que te dormiste la noche antes.
  const noche = sumarDias(diaActivo.abrir, -1);
  const [inicioAbrir, dormirAnoche] = await Promise.all([
    diaActivo.abrir === hoy ? inicio : leerInicio(diaActivo.abrir),
    listarHorasDormir(noche, noche).catch(() => []),
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
        {/* Ajustes, tu perfil y salir están en el panel «Tu estado» (derecha). */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            <SaludoLocal nombre={perfil.display_name} />
          </h1>
        </header>

        <AvisoDemo />

        <AyudaPantalla seccion="hoy" />

        <div data-guia="despertar">
          <EmpiezoElDia
            inicio={inicioAbrir}
            ajustes={ajustesDelDia(ajustes, inicioAbrir)}
            rutinas={deHoy}
            modo={diaActivo.modo}
            dia={hoy}
            anoche={dormirAnoche[0]?.bed_time ?? null}
          />
        </div>

        <AvisoSobrecarga
          hoy={hoy}
          ajustes={ajustesHoy}
          agenda={agenda}
          rutinas={deHoy}
        />

        <RecordatoriosHabitos hoy={hoy} zona={timezone} />

        {/* Tu plan y tus tareas, juntos: el plan dice por cuál empezar y,
            debajo, las de otros días para decidir qué hacer con ellas. */}
        <div data-guia="plan" className="flex flex-col gap-4">
          <PlanDeHoy hoy={hoy} />
          <TareasDeHoy hoy={hoy} />
        </div>

        <section data-guia="captura" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Apunta algo</h2>
          {/* ✨ al lado del «+»: la puerta de tu asistente personal. */}
          <CapturaRapida conAsistente={iaDisponible()} />
        </section>

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Agenda de hoy</h2>
            <Link href="/agenda" className="enlace text-sm">
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

        <MetasProximas hoy={hoy} />

        {/* Solo si usas Empleo (se enciende en Ajustes). */}
        {secciones.empleo && <SeguimientosEmpleo hoy={hoy} />}

        {/* Foco ya no tiene tarjeta: está en «Concentrarme» del plan, en las
            rutinas con modo foco y en los atajos del panel «Tu estado». */}

        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Rutinas</h2>
            <Link
              href="/ajustes/rutinas/nuevo?desde=hoy"
              className="enlace text-sm"
            >
              + Añadir
            </Link>
          </header>
          {deHoy.length === 0 ? (
            <p className="text-sm text-muted">
              Hoy no toca ninguna. Pulsa «+ Añadir» para crear una.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filasDeHoy(deHoy).map((f) => (
                <FilaRutina
                  key={`${f.item.rutina.id}|${f.vez?.numero ?? 0}`}
                  fila={f}
                />
              ))}
            </ul>
          )}
        </section>

        <HabitosDeHoy hoy={hoy} />

        <CierreDeHoy hoy={hoy} />
      </main>
      <BarraInferior actual="/" />
    </>
  );
}

// Una rutina de 1 vez al día, o una de las veces de una rutina de varias.
function FilaRutina({ fila }: { fila: FilaRutinaHoy }) {
  const { item, vez, hecha } = fila;
  const { rutina, hechas } = item;
  const minutos = rutina.duration_minutes
    ? ` · ${rutina.duration_minutes} min`
    : "";
  // Con varias veces: «1.ª vez de 2 · 9:15». Con una: «0 de 1 · Por la mañana».
  const detalle = vez
    ? `${nombreVez(vez.numero)} de ${rutina.times_per_day}${
        vez.hora ? ` · ${vez.hora}` : ""
      }${minutos}`
    : `${hechas} de ${rutina.times_per_day}${minutos} · ${textoFranja(rutina)}`;
  const puedeDeshacer = vez ? vez.hecha : hechas > 0;
  return (
    <li className="card flex items-center gap-3 p-4">
      <div className="flex flex-1 flex-col gap-1">
        {/* Tocando el nombre la cambias (y ahí activas el modo foco). */}
        <Link
          href={`/ajustes/rutinas/${rutina.id}?desde=hoy`}
          className={`break-words ${hecha ? "text-muted line-through" : ""}`}
        >
          {rutina.title}
        </Link>
        <span className="text-sm text-muted">{detalle}</span>
      </div>
      {puedeDeshacer && (
        <form action={deshacerRutinaHecha}>
          <input type="hidden" name="id" value={rutina.id} />
          {vez && <input type="hidden" name="vez" value={vez.numero} />}
          <button type="submit" className="text-sm text-muted underline">
            Deshacer
          </button>
        </form>
      )}
      {/* Con modo foco, «Empezar» abre Foco: alejas el móvil y mides el tiempo. */}
      {!hecha && rutina.focus && (
        <Link
          href={`/foco?rutina=${rutina.id}`}
          className="button-primary py-2 text-sm"
        >
          Empezar
        </Link>
      )}
      {!hecha && !rutina.focus && (
        <form action={marcarRutinaHecha}>
          {/* Con varias veces al día, se apunta qué vez has hecho. */}
          <input type="hidden" name="id" value={rutina.id} />
          {vez && <input type="hidden" name="vez" value={vez.numero} />}
          <button type="submit" className="button-primary py-2 text-sm">
            Hecho
          </button>
        </form>
      )}
    </li>
  );
}
