import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { deshacerApunte, pausarHabito } from "@/app/habitos/actions";
import { Apuntar } from "@/app/habitos/apuntar";
import { BarraInferior } from "@/app/componentes/barra-inferior";
import { leerAjustes } from "@/lib/data/ajustes";
import { listarHabitos, listarRegistrosEntre } from "@/lib/data/habitos";
import {
  DIAS_SEMANA,
  describirRepeticion,
  leerRegla,
} from "@/lib/planner/agenda";
import { hoyEn, sumarDias } from "@/lib/planner/fechas";
import {
  IDEAS,
  numero,
  resumenSemana,
  textoCantidad,
  textoMeta,
  textoRecordatorio,
  textoTendencia,
  totalDelDia,
  type Habito,
  type RegistroHabito,
} from "@/lib/planner/habitos";
import { parseISO } from "date-fns";

export const metadata: Metadata = { title: "Hábitos" };

// Hábitos: lo que quieres observar, con lo apuntado hoy y un resumen de la semana.
export default async function HabitosPage() {
  const { timezone } = await leerAjustes();
  const hoy = hoyEn(timezone);
  // Dos semanas: esta y la anterior, para comparar.
  const [habitos, registros] = await Promise.all([
    listarHabitos(),
    listarRegistrosEntre(sumarDias(hoy, -13), hoy),
  ]);
  const activos = habitos.filter((h) => h.active);
  const pausados = habitos.filter((h) => !h.active);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Hábitos</h1>
          <Link
            href="/habitos/nuevo"
            className="button-primary gap-1 py-2 text-sm"
          >
            <Plus aria-hidden className="size-4" />
            Añadir
          </Link>
        </header>

        <Link href="/habitos/avisos" className="enlace -mt-4 text-sm">
          Avisos con la app cerrada
        </Link>

        <p className="text-sm text-muted">
          Apunta lo que quieras observar, a tu ritmo. Aquí no hay rachas que se
          rompen ni notas: solo tus datos, para que veas cómo vas. Lo que
          apuntas aquí nunca se envía a la IA.
        </p>

        {habitos.length === 0 && (
          <section className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Ideas para empezar</h2>
            <p className="text-sm text-muted">
              Toca una para rellenar el formulario. Puedes cambiarlo todo antes
              de guardar, o empezar de cero con «Añadir».
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(IDEAS).map(([clave, idea]) => (
                <Link
                  key={clave}
                  href={`/habitos/nuevo?idea=${clave}`}
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                >
                  {idea.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {activos.length > 0 && (
          <ul className="flex flex-col gap-3">
            {activos.map((h) => (
              <FichaHabito
                key={h.id}
                habito={h}
                registros={registros}
                hoy={hoy}
              />
            ))}
          </ul>
        )}

        {pausados.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">En pausa</h2>
            <ul className="flex flex-col gap-2">
              {pausados.map((h) => (
                <li
                  key={h.id}
                  className="card flex items-center gap-3 p-4 opacity-60"
                >
                  <Link
                    href={`/habitos/${h.id}`}
                    className="flex-1 break-words"
                  >
                    {h.title}
                  </Link>
                  <BotonPausa habito={h} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BarraInferior actual="/habitos" />
    </>
  );
}

function FichaHabito({
  habito,
  registros,
  hoy,
}: {
  habito: Habito;
  registros: RegistroHabito[];
  hoy: string;
}) {
  const totalHoy = totalDelDia(registros, habito.id, hoy);
  const resumen = resumenSemana(habito, registros, hoy);
  const tendencia = textoTendencia(resumen, habito.direction);
  const dias = habito.repeat_rule
    ? describirRepeticion(leerRegla(habito.repeat_rule))
    : null;

  return (
    <li className="card flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/habitos/${habito.id}`}
          className="flex flex-1 flex-col gap-1"
        >
          <span className="break-words font-medium">{habito.title}</span>
          <span className="text-sm text-muted">
            {[textoMeta(habito), dias, textoRecordatorio(habito)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </Link>
        <BotonPausa habito={habito} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 text-sm">
          <span>
            Hoy:{" "}
            {totalHoy === null
              ? "aún nada apuntado"
              : textoCantidad(totalHoy, habito.unit)}
          </span>
          {totalHoy !== null && (
            <form action={deshacerApunte}>
              <input type="hidden" name="id" value={habito.id} />
              <button type="submit" className="text-muted underline">
                Deshacer el último
              </button>
            </form>
          )}
        </div>
        <Apuntar
          id={habito.id}
          unidad={habito.unit}
          ninguno={habito.direction === "menos" && totalHoy === null}
        />
      </div>

      <Semana dias={resumen.dias} />

      <div className="flex flex-col gap-1 text-sm text-muted">
        {resumen.media !== null ? (
          <span>
            Media de los días apuntados: {numero(resumen.media)}
            {habito.unit ? ` ${habito.unit}` : ""} al día (
            {resumen.diasConApuntes} de 7 días)
          </span>
        ) : (
          <span>Esta semana aún no has apuntado nada.</span>
        )}
        {resumen.diasEnMeta !== null && resumen.diasConApuntes > 0 && (
          <span>
            Dentro de tu meta: {resumen.diasEnMeta} de {resumen.diasConApuntes}{" "}
            días apuntados
          </span>
        )}
        {tendencia && <span>{tendencia}</span>}
      </div>
    </li>
  );
}

// Los últimos 7 días en una fila: la letra del día y lo apuntado.
// Mismo color para todo: un número alto o bajo no es "bueno" ni "malo".
function Semana({ dias }: { dias: { fecha: string; total: number | null }[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1 text-center text-xs">
      {dias.map((d) => {
        // getDay(): 0 = domingo; DIAS_SEMANA empieza en lunes.
        const dia = DIAS_SEMANA[(parseISO(d.fecha).getDay() + 6) % 7];
        return (
          <li
            key={d.fecha}
            className="flex flex-col gap-1 rounded-lg border border-border py-1"
          >
            <span className="text-muted" aria-hidden>
              {dia.corto}
            </span>
            <span className="sr-only">{dia.nombre}</span>
            <span>{d.total === null ? "·" : numero(d.total)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function BotonPausa({ habito }: { habito: Habito }) {
  return (
    <form action={pausarHabito}>
      <input type="hidden" name="id" value={habito.id} />
      <input type="hidden" name="activo" value={habito.active ? "no" : "si"} />
      <button type="submit" className="text-sm underline">
        {habito.active ? "Pausar" : "Reanudar"}
      </button>
    </form>
  );
}
