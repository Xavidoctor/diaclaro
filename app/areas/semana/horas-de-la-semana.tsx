import Link from "next/link";
import { leerAjustes } from "@/lib/data/ajustes";
import { cargarProgreso } from "@/lib/data/progreso";
import { textoHoras } from "@/lib/planner/areas";
import { nombreDia } from "@/lib/planner/fechas";
import { reparto, type DiaProgreso, type Media } from "@/lib/planner/progreso";

// Cómo se reparten tus horas cada día de la semana (sueño, en pie, lo que has
// usado y lo que queda sin apuntar). Antes era la pantalla «Tu progreso»;
// ahora es una parte de «Tu semana», para tener todo en un solo sitio.
export async function HorasDeLaSemana({
  desde,
  hasta,
}: {
  desde: string;
  hasta: string;
}) {
  const ajustes = await leerAjustes();
  const { dias, resumen } = await cargarProgreso(desde, hasta, ajustes);
  const sinHoras = dias.every((d) => d.enPie === null && d.sueno === null);
  const suenoAprox = dias.filter((d) => d.suenoAprox).length;

  return (
    <div id="horas" className="flex scroll-mt-6 flex-col gap-6">
      {sinHoras && (
        <p className="card text-sm">
          Aún no hay horas de despertar esta semana. Pulsa{" "}
          <Link href="/despierto" className="enlace">
            Despierto y Levantado
          </Link>{" "}
          al empezar el día y pon tu hora de acostarte en{" "}
          <Link href="/ajustes" className="enlace">
            Ajustes
          </Link>
          : así la app puede calcular tu día sin inventarse nada.
        </p>
      )}

      <section aria-labelledby="medias" className="flex flex-col gap-3">
        <h2 id="medias" className="text-lg font-semibold">
          Tus horas: de media, cada día
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          <Dato
            nombre="Sueño"
            media={resumen.sueno}
            nota={
              suenoAprox > 0
                ? `Aproximado en ${suenoAprox === 1 ? "1 día" : `${suenoAprox} días`}: falta «Me voy a dormir»`
                : "Con tu hora real de acostarte"
            }
          />
          <Dato
            nombre="En la cama despierto"
            media={resumen.enCama}
            nota="De Despierto a Levantado"
          />
          <Dato nombre="En pie" media={resumen.enPie} />
          <Dato
            nombre="Horas usadas"
            media={resumen.usado}
            nota="Foco, tareas, candidaturas y rutinas"
          />
          <Dato nombre="Agenda" media={resumen.agenda} />
          <Dato
            nombre="Sin apuntar"
            media={resumen.sinApuntar}
            nota="En pie sin nada apuntado"
          />
        </ul>
      </section>

      {dias.length > 0 && (
        // Plegado: el día a día es para cuando quieres mirar con calma.
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer font-medium">
            Ver día a día
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Leyenda />
            <ul className="flex flex-col gap-2">
              {[...dias].reverse().map((d) => (
                <FilaDia key={d.fecha} dia={d} />
              ))}
            </ul>
          </div>
        </details>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">
          ¿Cómo se calculan estas horas?
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
          <li>
            Sueño: desde tu hora de acostarte de la noche anterior hasta que
            pulsas Despierto (o Levantado). La hora de acostarte es la de{" "}
            <Link href="/dormir" className="enlace">
              Me voy a dormir
            </Link>
            ; si no la pulsaste, se usa la hora prevista (la de ese día o la de
            Ajustes) y el sueño sale como aproximado.
          </li>
          <li>En pie: desde Levantado hasta tu hora de acostarte.</li>
          <li>
            Horas usadas: el temporizador de foco, lo que contestas en «¿Cuánto
            has tardado?», los minutos de tus candidaturas y las rutinas que
            marcas como hechas (con su duración).
          </li>
          <li>Agenda: lo que tiene hora de inicio y de fin.</li>
          <li>
            Sin apuntar: lo que queda de tu tiempo en pie sin nada apuntado.
            Comer, descansar o el móvil también caen aquí: no es malo, solo es
            un dato para que lo mires.
          </li>
        </ul>
        <p className="mt-2 text-muted">
          Hoy no entra en las medias (salvo el sueño de anoche) porque el día
          aún no ha terminado.
        </p>
      </details>
    </div>
  );
}

function Dato({
  nombre,
  media,
  nota,
}: {
  nombre: string;
  media: Media;
  nota?: string;
}) {
  return (
    <li className="card flex flex-col gap-1 p-4">
      <span className="text-sm text-muted">{nombre}</span>
      <span className="text-xl font-semibold">
        {media.media === null ? "—" : textoHoras(media.media)}
      </span>
      {nota && <span className="text-xs text-muted">{nota}</span>}
      {media.dias > 0 && (
        <span className="text-xs text-muted">
          {media.dias === 1 ? "1 día" : `${media.dias} días`} con datos
        </span>
      )}
    </li>
  );
}

function Leyenda() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="size-3 rounded-full bg-primary" />
        Usadas
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="size-3 rounded-full bg-primary/40" />
        Agenda
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="size-3 rounded-full bg-secondary" />
        Sin apuntar
      </span>
    </p>
  );
}

function hora(minutos: number | null): string {
  return minutos === null ? "—" : textoHoras(minutos);
}

function FilaDia({ dia }: { dia: DiaProgreso }) {
  const barra = reparto(dia);
  return (
    <li className="card flex flex-col gap-2 p-4">
      <p className="flex items-baseline justify-between gap-3">
        <span className="font-medium first-letter:uppercase">
          {nombreDia(dia.fecha)}
        </span>
        {dia.esHoy && <span className="text-xs text-muted">Hasta ahora</span>}
      </p>
      {barra && (
        <div
          role="img"
          aria-label={`Usadas ${barra.usado} %, agenda ${barra.agenda} %, sin apuntar ${barra.sinApuntar} %`}
          className="flex h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${barra.usado}%` }}
          />
          <div
            className="h-full bg-primary/40"
            style={{ width: `${barra.agenda}%` }}
          />
        </div>
      )}
      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm">
        <Par
          nombre={dia.suenoAprox ? "Sueño (aprox.)" : "Sueño"}
          valor={hora(dia.sueno)}
        />
        <Par nombre="En pie" valor={hora(dia.enPie)} />
        <Par nombre="En la cama" valor={hora(dia.enCama)} />
        <Par nombre="Usadas" valor={hora(dia.usado)} />
        <Par nombre="Agenda" valor={hora(dia.agenda)} />
        <Par nombre="Sin apuntar" valor={hora(dia.sinApuntar)} />
      </dl>
    </li>
  );
}

function Par({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted">{nombre}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
