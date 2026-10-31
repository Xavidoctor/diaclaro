import type { Metadata } from "next";
import Link from "next/link";
import { cargarAgendaGoogle } from "@/app/componentes/agenda-google";
import { CalendarioMes } from "@/app/agenda/calendario-mes";
import { DiaPorHoras, type CuadroDelDia } from "@/app/agenda/dia-por-horas";
import { EventoGoogle } from "@/app/agenda/evento-google";
import { ListaDelDia } from "@/app/agenda/lista-del-dia";
import { MetasDelDia } from "@/app/agenda/metas-del-dia";
import { NuevaTareaDia } from "@/app/agenda/nueva-tarea-dia";
import { TareaItem } from "@/app/bandeja/tarea-item";
import { AEsteDia } from "@/app/agenda/a-este-dia";
import { MoverTareas } from "@/app/componentes/mover-tareas";
import { AvisoGoogle } from "@/app/componentes/aviso-google";
import { DesplegarAnadir } from "@/app/componentes/desplegar-anadir";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { BarraHorasDia } from "@/app/componentes/barra-horas-dia";
import { calcularSituacion } from "@/app/componentes/situacion-hoy";
import { leerHorasSueno } from "@/lib/data/horas-libres";
import { leerInicio } from "@/lib/data/inicio-dia";
import { horasDelDia, minutosOcupados } from "@/lib/planner/horas-del-dia";
import { ajustesDelDia } from "@/lib/planner/inicio-dia";
import { rutinaEseDia } from "@/lib/planner/mover-dia";
import { rutinasDelDia } from "@/lib/planner/rutinas";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { cargarOpcionesProyecto } from "@/lib/data/areas";
import { listarTareas } from "@/lib/data/bandeja";
import { listarMetasPendientes } from "@/lib/data/metas";
import { listarRegistrosDelDia, listarRutinas } from "@/lib/data/rutinas";
import {
  leerOpcionesRutinas,
  listarMovidas,
  type OpcionesRutina,
} from "@/lib/data/mover-dia";
import { tareasDesdeGoogle } from "@/lib/data/google";
import {
  ocurrenciasEntre,
  textoHora,
  type Ocurrencia,
} from "@/lib/planner/agenda";
import { opcionesProyecto } from "@/lib/planner/areas";
import { bloquesDeRutinas, bloquesDeTareas } from "@/lib/planner/bloques";
import {
  diasConTareas,
  tareasDelDia,
  tareasParaHoy,
} from "@/lib/planner/bandeja";
import { areasDelDia, textoDiaDe } from "@/lib/planner/resumen-dias";
import {
  juntarRangos,
  leerMesParam,
  mesDe,
  mesInicial,
  semanasDelMes,
} from "@/lib/planner/calendario";
import { esFecha, horaEn, nombreDia, sumarDias } from "@/lib/planner/fechas";
import { claveGoogle, juntarAgendas } from "@/lib/planner/google-calendar";
import {
  conRutinasHechas,
  cuentaHechas,
  marcarGrabadas,
} from "@/lib/planner/dia-por-horas";
import { metasPorDia } from "@/lib/planner/metas";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { enlaceBloque } from "@/app/agenda/lista-del-dia";
import { diaDeHoy } from "@/lib/data/dia-activo";

export const metadata: Metadata = { title: "Agenda" };

// Los días que se resumen debajo del recuadro.
const DIAS_RESUMEN = 2;
// Lo que se enseña de cada día del resumen.
const COSAS_RESUMEN = 4;
// Las tareas abiertas que se ven debajo del día (el resto, en Tareas).
const ABIERTAS_A_LA_VISTA = 5;

// La Agenda:
//   1. Un recuadro con un día entero, por horas (al entrar, hoy). Con las
//      flechas ‹ › vas al día anterior o al siguiente.
//   2. Debajo, un resumen de los dos días siguientes (tocarlos los abre arriba).
//   3. Un calendario del mes para saltar a cualquier día.
// /agenda?dia=2026-12-03 abre ese día en el recuadro (y su mes).
// /agenda?mes=2027-01 enseña ese mes en el calendario.
export default async function AgendaPage({
  searchParams,
}: PageProps<"/agenda">) {
  const params = await searchParams;
  const ajustes = await leerAjustes();
  const { timezone } = ajustes;
  const hoy = await diaDeHoy();
  const dia =
    typeof params.dia === "string" && esFecha(params.dia) ? params.dia : hoy;
  const siguientes = Array.from({ length: DIAS_RESUMEN }, (_, i) =>
    sumarDias(dia, i + 1),
  );
  const mes = leerMesParam(
    params.mes,
    typeof params.dia === "string" ? mesDe(dia) : mesInicial(hoy),
  );
  const diasDelMes = semanasDelMes(mes).flat();

  // Se cargan solo los días que se ven: el recuadro, el resumen y el mes.
  const rangos = juntarRangos([
    { desde: dia, hasta: siguientes.at(-1)! },
    { desde: diasDelMes[0], hasta: diasDelMes.at(-1)! },
  ]);
  const hasta = rangos.at(-1)!.hasta;

  const [
    eventos,
    googles,
    tareas,
    rutinasGuardadas,
    { areas, proyectos },
    metas,
    opciones,
    movidas,
    registrosDia,
    inicioHoy,
    { sueno },
  ] = await Promise.all([
    listarEventosHasta(hasta),
    Promise.all(
      rangos.map((r) => cargarAgendaGoogle(r.desde, r.hasta, timezone)),
    ),
    listarTareas(false),
    listarRutinas(),
    cargarOpcionesProyecto(),
    // Entregas, exámenes y metas. Si falta su migración, simplemente no salen.
    listarMetasPendientes(hasta, rangos[0].desde).catch(() => []),
    // Qué rutinas tienen hora fija o están grabadas, y lo que has movido.
    // Si falta su migración, todo sale con su hora de siempre.
    leerOpcionesRutinas().catch(() => new Map<string, OpcionesRutina>()),
    listarMovidas(rangos[0].desde, hasta).catch(() => []),
    // Las rutinas que ya has hecho ese día (para su casilla de «Hecho»).
    listarRegistrosDelDia(dia).catch(() => []),
    // Cuándo te has despertado hoy (para las horas del día).
    dia === hoy ? leerInicio(hoy) : Promise.resolve(null),
    leerHorasSueno(),
  ]);
  const rutinas = rutinasGuardadas.map((r) => ({
    ...r,
    fixed_time: opciones.get(r.id)?.fija ?? null,
    recorded: opciones.get(r.id)?.grabada ?? false,
  }));
  const google = {
    estado: googles[0].estado,
    ocurrencias: googles.flatMap((g) => g.ocurrencias),
  };
  const excepciones = await listarExcepciones(eventos.map((e) => e.id));
  // Las tareas que ya creaste desde eventos de Google. Si falla (por ejemplo,
  // porque falta aplicar la migración), solo se esconden los botones.
  const importadas =
    google.estado === "conectado"
      ? await Promise.all(
          rangos.map((r) => tareasDesdeGoogle(r.desde, r.hasta)),
        )
          .then((mapas) => new Map(mapas.flatMap((m) => [...m])))
          .catch((error) => {
            console.error(error);
            return null;
          })
      : null;
  // Tus compromisos, más las tareas y rutinas con hora (los ratos que
  // tienes reservados, de cualquier proyecto), más lo de Google.
  const todas = juntarAgendas(
    rangos.flatMap((r) => [
      ...ocurrenciasEntre(eventos, excepciones, r.desde, r.hasta),
      ...bloquesDeTareas(tareas, r.desde, r.hasta),
      ...bloquesDeRutinas(rutinas, r.desde, r.hasta, movidas),
    ]),
    google.ocurrencias,
  );
  // Lo de un día, con las clases grabadas que se juntan con otra ya marcadas.
  const delDia = (fecha: string) =>
    marcarGrabadas(todas.filter((o) => o.fecha === fecha));
  const metasDelDia = metasPorDia(metas);
  // Un puntito en el calendario si ese día hay algo apuntado o tareas sin hacer.
  const diasConAlgo = new Set([
    ...todas.map((o) => o.fecha),
    ...diasConTareas(tareas),
    ...metasDelDia.keys(),
  ]);

  const deEsteDia = conRutinasHechas(delDia(dia), rutinas, registrosDia, dia);
  const cuenta = cuentaHechas(deEsteDia);
  const conHora = deEsteDia.filter((o) => o.horaInicio);
  const sinHora = deEsteDia.filter((o) => !o.horaInicio);
  const tareasDia = tareasDelDia(tareas, dia);
  // Las tareas abiertas: pendientes y sin día, para ponerlas en este día.
  const abiertas = tareasParaHoy(tareas, hoy).sinDia;
  // De qué va cada día del resumen, según las áreas de sus tareas y rutinas.
  const proyectoDeTarea = new Map(tareas.map((t) => [t.id, t.project_id]));
  const proyectoDeRutina = new Map(rutinas.map((r) => [r.id, r.project_id]));
  const diaDe = (fecha: string) =>
    textoDiaDe(
      areasDelDia(
        [
          ...delDia(fecha).map((o) =>
            o.bloque?.tipo === "tarea"
              ? proyectoDeTarea.get(o.bloque.id)
              : o.bloque
                ? proyectoDeRutina.get(o.bloque.id)
                : null,
          ),
          ...tareasDelDia(tareas, fecha).map((t) => t.project_id),
        ],
        proyectos,
        areas,
      ),
    );
  const grupos = opcionesProyecto(areas, proyectos);
  const sePuedeOrdenar = dia >= hoy;
  const horas = await horasDeEsteDia();
  const cuadros: CuadroDelDia[] = conHora.map((o) => ({
    o,
    clave: `${o.eventoId}|${o.fechaOriginal}`,
    href: o.google
      ? null
      : o.bloque
        ? enlaceBloque(o)
        : `/agenda/${o.eventoId}?dia=${o.fechaOriginal}`,
  }));
  // Lo de Google se ve en el día, y al tocarlo salen sus botones.
  const detallesGoogle = Object.fromEntries(
    conHora
      .filter((o) => o.google)
      .map((o) => [
        `${o.eventoId}|${o.fechaOriginal}`,
        <EventoGoogle
          key={o.eventoId}
          o={o}
          tareaId={importadas?.get(claveGoogle(o))}
          puedeImportar={importadas !== null}
        />,
      ]),
  );

  // Las horas ocupadas y libres del día del recuadro (lib/planner/horas-del-dia.ts).
  // Hoy: desde que te despertaste hasta acostarte, y lo ocupado es lo mismo
  // que cuenta la tarjeta de Hoy. Otro día: 24 h menos tus horas de sueño.
  async function horasDeEsteDia() {
    if (dia !== hoy) {
      const sinHora = tareasDia
        .filter((t) => !t.done_at && !t.due_time)
        .reduce((suma, t) => suma + (t.estimated_minutes ?? 0), 0);
      return horasDelDia({
        ahora: null,
        despertar: null,
        acostarse: null,
        ocupado: minutosOcupados(deEsteDia, null, sinHora),
        horasSueno: sueno,
      });
    }
    const ahora = horaEn(timezone);
    const { carga } = await calcularSituacion({
      hoy,
      ajustes: ajustesDelDia(ajustes, inicioHoy),
      agenda: juntarAgendas(
        ocurrenciasEntre(eventos, excepciones, hoy, hoy),
        google.ocurrencias.filter((o) => o.fecha === hoy),
      ),
      // Como en Hoy: con las rutinas que moviste de hora solo hoy.
      rutinas: rutinasDelDia(
        rutinasGuardadas.map((r) => rutinaEseDia(r, movidas, hoy)),
        registrosDia,
        hoy,
      ),
    });
    return horasDelDia({
      ahora,
      despertar:
        inicioHoy?.start_time ?? inicioHoy?.awake_time ?? ajustes.wake_time,
      acostarse: inicioHoy?.sleep_time ?? ajustes.sleep_time,
      ocupado:
        carga.estado === "falta-hora-acostarse"
          ? minutosOcupados(deEsteDia, ahora)
          : carga.apuntado,
      horasSueno: sueno,
    });
  }

  // Dirección para cambiar de mes o elegir un día sin perder lo demás.
  function enlace(cambio: { mes?: string; dia?: string }) {
    const p = new URLSearchParams();
    if (cambio.dia) {
      p.set("dia", cambio.dia);
      return `/agenda?${p}#dia`;
    }
    if (dia !== hoy) p.set("dia", dia);
    if (cambio.mes) p.set("mes", cambio.mes);
    return `/agenda?${p}#calendario`;
  }
  const irA = (fecha: string) =>
    fecha === hoy ? "/agenda#dia" : `/agenda?dia=${fecha}#dia`;

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
          <Link
            href={`/agenda/nuevo?dia=${dia}`}
            data-guia="agenda-anadir"
            className="button-primary gap-1 py-2 text-sm"
          >
            <Plus aria-hidden className="size-4" />
            Añadir
          </Link>
        </header>

        <AvisoGoogle estado={google.estado} />

        {/* 1. El recuadro del día. */}
        <section
          id="dia"
          aria-label="El día"
          className="card flex scroll-mt-4 flex-col gap-4 p-4"
        >
          {/* Arriba, el día. Las flechas para cambiar de día van abajo. */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold first-letter:uppercase">
              {nombreDia(dia)}
            </h2>
            {dia === hoy && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                Hoy
              </span>
            )}
            {cuenta.total > 0 && (
              <span className="ml-auto text-sm text-muted">
                {cuenta.hechas} de {cuenta.total} hechas
              </span>
            )}
          </div>

          <BarraHorasDia horas={horas} esHoy={dia === hoy} />

          <MetasDelDia metas={metasDelDia.get(dia) ?? []} />

          {sinHora.length > 0 && (
            <ListaDelDia ocurrencias={sinHora} importadas={importadas} />
          )}

          {conHora.length === 0 && sinHora.length === 0 ? (
            <p className="text-sm text-muted">
              Nada apuntado con hora. Pulsa «Añadir» para apuntar tus
              compromisos, como las clases o el trabajo.
            </p>
          ) : (
            conHora.length > 0 && (
              <DiaPorHoras
                cuadros={cuadros}
                sePuedeOrdenar={sePuedeOrdenar}
                ahora={dia === hoy ? horaEn(timezone) : null}
                esHoy={dia === hoy}
                detallesGoogle={detallesGoogle}
              />
            )
          )}

          <div className="flex flex-col gap-2">
            <h3
              id="tareas-del-dia"
              className="scroll-mt-4 text-sm font-semibold uppercase tracking-wide text-muted"
            >
              Tareas de este día
            </h3>
            {tareasDia.length === 0 ? (
              <p className="text-sm text-muted">Ninguna tarea este día.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tareasDia.map((tarea) => (
                  <TareaItem key={tarea.id} tarea={tarea} grupos={grupos}>
                    {/* Si ese día ya pasó y no la hiciste, puedes traerla a hoy. */}
                    {dia < hoy && !tarea.done_at && (
                      <MoverTareas ids={[tarea.id]} hoy={hoy} />
                    )}
                  </TareaItem>
                ))}
              </ul>
            )}
            {sePuedeOrdenar && (
              <DesplegarAnadir texto="Añadir tarea a este día">
                <NuevaTareaDia dia={dia} />
              </DesplegarAnadir>
            )}
          </div>

          <nav
            aria-label="Cambiar de día"
            className="flex items-center justify-between gap-2 border-t border-border pt-3"
          >
            <Link
              href={irA(sumarDias(dia, -1))}
              className="enlace inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm hover:bg-secondary"
            >
              <ChevronLeft aria-hidden className="size-5" />
              Día anterior
            </Link>
            {dia !== hoy && (
              <Link href="/agenda#dia" className="enlace text-sm">
                Volver a hoy
              </Link>
            )}
            <Link
              href={irA(sumarDias(dia, 1))}
              className="enlace inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm hover:bg-secondary"
            >
              Día siguiente
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          </nav>
        </section>

        {/* Las tareas abiertas (sin día): ponlas en el día de arriba. */}
        {abiertas.length > 0 && (
          <section
            aria-labelledby="tareas-abiertas"
            className="card flex flex-col gap-3 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="tareas-abiertas" className="font-semibold">
                Tareas abiertas ({abiertas.length})
              </h2>
              <Link href="/bandeja?pestana=tareas" className="enlace text-sm">
                Ver todas
              </Link>
            </div>
            <p className="text-xs text-muted">
              Sin día. Ponlas en {dia === hoy ? "hoy" : "este día"} cuando
              quieras hacerlas.
            </p>
            <ul className="flex flex-col gap-2">
              {abiertas.slice(0, ABIERTAS_A_LA_VISTA).map((tarea) => (
                <TareaItem key={tarea.id} tarea={tarea} grupos={grupos}>
                  {sePuedeOrdenar && (
                    <AEsteDia
                      id={tarea.id}
                      dia={dia}
                      texto={dia === hoy ? "Poner hoy" : "Poner en este día"}
                    />
                  )}
                </TareaItem>
              ))}
            </ul>
            {abiertas.length > ABIERTAS_A_LA_VISTA && (
              <p className="text-xs text-muted">
                Y {abiertas.length - ABIERTAS_A_LA_VISTA} más en Tareas.
              </p>
            )}
          </section>
        )}

        {/* 2. El resumen de los días siguientes. */}
        <section
          aria-label="Los días siguientes"
          className="flex flex-col gap-3"
        >
          {siguientes.map((fecha) => (
            <ResumenDia
              key={fecha}
              fecha={fecha}
              hoy={hoy}
              href={irA(fecha)}
              ocurrencias={delDia(fecha)}
              diaDe={diaDe(fecha)}
              tareas={
                tareasDelDia(tareas, fecha).filter((t) => !t.done_at).length
              }
            />
          ))}
        </section>

        {/* 3. El calendario. */}
        <CalendarioMes
          mes={mes}
          hoy={hoy}
          elegido={dia}
          diasConAlgo={diasConAlgo}
          enlace={enlace}
        />

        <Link
          href="/ordenar?modo=cambio"
          className="self-start text-sm underline"
        >
          ¿Algo ha cambiado? Cuéntamelo y lo reorganizo
        </Link>
      </main>
      <BarraInferior actual="/agenda" />
    </>
  );
}

// Un día del resumen: de qué va ese día («Día de Estudio y Dropshipping»,
// según tus áreas). Si nada tiene área, lo primero que tiene. Tocarlo lo
// abre en el recuadro de arriba.
function ResumenDia({
  fecha,
  hoy,
  href,
  ocurrencias,
  diaDe,
  tareas,
}: {
  fecha: string;
  hoy: string;
  href: string;
  ocurrencias: Ocurrencia[];
  diaDe: string | null;
  tareas: number;
}) {
  const vistas = ocurrencias.slice(0, COSAS_RESUMEN);
  const mas = ocurrencias.length - vistas.length;
  return (
    <Link href={href} className="card flex flex-col gap-1 p-4">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted first-letter:uppercase">
          {nombreDia(fecha)}
          {fecha === sumarDias(hoy, 1) && " · mañana"}
        </span>
        <ChevronRight aria-hidden className="size-4 text-muted" />
      </span>
      {diaDe ? (
        <span className="font-medium">{diaDe}</span>
      ) : vistas.length === 0 && tareas === 0 ? (
        <span className="text-sm text-muted">Nada apuntado.</span>
      ) : (
        <ul className="flex flex-col gap-0.5 text-sm">
          {vistas.map((o) => (
            <li key={`${o.eventoId}|${o.fechaOriginal}`} className="flex gap-2">
              <span className="w-24 shrink-0 text-muted">{textoHora(o)}</span>
              <span className="min-w-0 flex-1 truncate">{o.titulo}</span>
            </li>
          ))}
          {mas > 0 && <li className="text-xs text-muted">y {mas} más</li>}
          {tareas > 0 && (
            <li className="text-xs text-muted">
              {tareas === 1 ? "1 tarea" : `${tareas} tareas`} para este día
            </li>
          )}
        </ul>
      )}
    </Link>
  );
}
