import type { Metadata } from "next";
import Link from "next/link";
import { cargarAgendaGoogle } from "@/app/componentes/agenda-google";
import { CalendarioMes } from "@/app/agenda/calendario-mes";
import { ListaDelDia } from "@/app/agenda/lista-del-dia";
import { AvisoGoogle } from "@/app/componentes/aviso-google";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { listarEventosHasta, listarExcepciones } from "@/lib/data/agenda";
import { leerAjustes } from "@/lib/data/ajustes";
import { tareasDesdeGoogle } from "@/lib/data/google";
import {
  agruparPorDia,
  leerFechaParam,
  ocurrenciasEntre,
} from "@/lib/planner/agenda";
import {
  juntarRangos,
  leerMesParam,
  mesDe,
  semanasDelMes,
} from "@/lib/planner/calendario";
import {
  diasDesde,
  esFecha,
  hoyEn,
  nombreDia,
  sumarDias,
} from "@/lib/planner/fechas";
import { juntarAgendas } from "@/lib/planner/google-calendar";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Agenda" };

// Los días seguidos que se ven arriba. El resto, en el calendario.
const DIAS_VISTA = 3;

// La Agenda: arriba, tus próximos días; debajo, un calendario del mes
// para elegir cualquier día y ver lo que tienes.
// /agenda?desde=2026-11-09 enseña los días seguidos desde esa fecha.
// /agenda?dia=2026-12-03 elige ese día en el calendario (y abre su mes).
// /agenda?mes=2027-01 enseña ese mes en el calendario.
export default async function AgendaPage({
  searchParams,
}: PageProps<"/agenda">) {
  const params = await searchParams;
  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  const desde = leerFechaParam(params.desde, hoy);
  const dias = diasDesde(desde, DIAS_VISTA);
  const elegido =
    typeof params.dia === "string" && esFecha(params.dia) ? params.dia : null;
  const mes = leerMesParam(params.mes, mesDe(elegido ?? hoy));
  const diasDelMes = semanasDelMes(mes).flat();

  // Se cargan solo los días que se ven: los de arriba, el mes y el elegido.
  const rangos = juntarRangos([
    { desde, hasta: dias.at(-1)! },
    { desde: diasDelMes[0], hasta: diasDelMes.at(-1)! },
    ...(elegido ? [{ desde: elegido, hasta: elegido }] : []),
  ]);
  const hasta = rangos.at(-1)!.hasta;

  const [eventos, googles] = await Promise.all([
    listarEventosHasta(hasta),
    Promise.all(
      rangos.map((r) => cargarAgendaGoogle(r.desde, r.hasta, timezone)),
    ),
  ]);
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
  const todas = juntarAgendas(
    rangos.flatMap((r) =>
      ocurrenciasEntre(eventos, excepciones, r.desde, r.hasta),
    ),
    google.ocurrencias,
  );
  const porDia = agruparPorDia(todas, dias);
  const diasConAlgo = new Set(todas.map((o) => o.fecha));
  const delElegido = elegido ? todas.filter((o) => o.fecha === elegido) : [];

  // Dirección para cambiar de mes o elegir un día sin perder lo demás.
  function enlace(cambio: { mes?: string; dia?: string }) {
    const p = new URLSearchParams();
    if (desde !== hoy) p.set("desde", desde);
    if (cambio.dia) {
      p.set("dia", cambio.dia);
      return `/agenda?${p}#dia-elegido`;
    }
    if (elegido) p.set("dia", elegido);
    if (cambio.mes) p.set("mes", cambio.mes);
    return `/agenda?${p}#calendario`;
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
          <Link
            href="/agenda/nuevo"
            className="button-primary gap-1 py-2 text-sm"
          >
            <Plus aria-hidden className="size-4" />
            Añadir
          </Link>
        </header>

        <nav aria-label="Cambiar de días" className="flex gap-4 text-sm">
          <Link
            href={`/agenda?desde=${sumarDias(desde, -DIAS_VISTA)}`}
            className="enlace inline-flex min-h-11 items-center gap-0.5"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Anteriores
          </Link>
          {desde !== hoy && (
            <Link
              href="/agenda"
              className="enlace inline-flex min-h-11 items-center"
            >
              Hoy
            </Link>
          )}
          <Link
            href={`/agenda?desde=${sumarDias(desde, DIAS_VISTA)}`}
            className="enlace ml-auto inline-flex min-h-11 items-center gap-0.5"
          >
            Siguientes
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </nav>

        <Link href="/cambio" className="self-start text-sm underline">
          ¿Algo ha cambiado? Cuéntamelo y lo reorganizo
        </Link>

        <AvisoGoogle estado={google.estado} />

        {eventos.length === 0 && google.estado !== "conectado" && (
          <p className="card text-muted">
            Aún no hay nada en tu agenda. Pulsa «Añadir» para apuntar tus
            compromisos, como las tutorías o las clases. Si no sabes la hora
            exacta, puedes dejarla vacía o elegir solo «por la tarde».
          </p>
        )}

        <ol className="flex flex-col gap-5">
          {porDia.map(({ fecha, ocurrencias }) => (
            <li key={fecha} className="flex flex-col gap-2">
              <TituloDia fecha={fecha} hoy={hoy} />
              <ListaDelDia ocurrencias={ocurrencias} importadas={importadas} />
            </li>
          ))}
        </ol>

        <CalendarioMes
          mes={mes}
          hoy={hoy}
          elegido={elegido}
          diasConAlgo={diasConAlgo}
          enlace={enlace}
        />

        {elegido ? (
          <section
            id="dia-elegido"
            aria-label="Día elegido"
            className="flex scroll-mt-4 flex-col gap-2"
          >
            <TituloDia fecha={elegido} hoy={hoy} />
            <ListaDelDia ocurrencias={delElegido} importadas={importadas} />
            <Link
              href={`/agenda/nuevo?dia=${elegido}`}
              className="enlace inline-flex min-h-11 items-center gap-1 self-start text-sm"
            >
              <Plus aria-hidden className="size-4" />
              Añadir algo este día
            </Link>
          </section>
        ) : (
          <p className="text-sm text-muted">
            Toca un día del calendario para ver lo que tienes ese día.
          </p>
        )}
      </main>
      <BarraInferior actual="/agenda" />
    </>
  );
}

// "Jueves 30 de octubre", con la etiqueta «Hoy» si toca.
function TituloDia({ fecha, hoy }: { fecha: string; hoy: string }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
      <span className="first-letter:uppercase">{nombreDia(fecha)}</span>
      {fecha === hoy && (
        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs normal-case text-primary-foreground">
          Hoy
        </span>
      )}
    </h2>
  );
}
