import { aMinutos, textoDuracion } from "./carga";
import { MOTIVOS, type Motivo } from "./dia-dificil";
import type { HorasDelDia, ResumenProgreso } from "./progreso";
import { MIN_MUESTRAS, type Factor, type TipoTarea } from "./tiempos";

// «Así te conozco»: lo que la app ha aprendido de ti, contado en claro.
// Funciones puras, con pruebas en conocerte.test.ts.
//
// Nada de esto lo adivina una IA: son cuentas con lo que tú has apuntado.
// Si aún no hay bastantes datos, se dice («Aún estoy aprendiendo») en vez de
// sacar una conclusión con dos ejemplos. Y nunca se juzga: solo se describe.

export const DIAS_CONOCERTE = 28; // las últimas 4 semanas
export const MIN_DIAS = 5; // días con dato antes de hablar de tu horario
export const MIN_FOCO = 60; // minutos de Foco antes de decir cuándo rindes más
export const MIN_SESIONES = 3;

export type Franja = "mañana" | "tarde" | "noche";

export type Rasgo = {
  id: "ritmo" | "entregas" | "sueno" | "horario" | "foco" | "dias-dificiles";
  titulo: string;
  texto: string;
  deDonde: string; // de dónde sale, para que sepas por qué lo digo
  corregir?: { href: string; texto: string };
};

export type Pendiente = { id: Rasgo["id"]; texto: string };

export type SesionConHora = { started_at: string; minutes: number };

// Mañana de 6:00 a 14:00, tarde de 14:00 a 21:00, noche el resto.
export function franjaDe(hora: string): Franja {
  const m = aMinutos(hora);
  if (m >= 6 * 60 && m < 14 * 60) return "mañana";
  if (m >= 14 * 60 && m < 21 * 60) return "tarde";
  return "noche";
}

// La hora media de una lista de horas. Con «acostarse», las de madrugada
// (antes de las 12:00) cuentan como del día siguiente: así la media de
// 23:30 y 00:30 es 00:00, no 12:00.
export function horaMedia(
  horas: (string | null)[],
  deNoche = false,
): { hora: string; dias: number } | null {
  const minutos = horas
    .filter((h): h is string => Boolean(h))
    .map((h) => {
      const m = aMinutos(h);
      return deNoche && m < 12 * 60 ? m + 24 * 60 : m;
    });
  if (minutos.length === 0) return null;
  const media = Math.round(minutos.reduce((s, m) => s + m, 0) / minutos.length);
  // Redondeada al cuarto de hora: 10:07 → 10:00, 10:08 → 10:15.
  const redondeada = (Math.round(media / 15) * 15) % (24 * 60);
  const dos = (n: number) => String(n).padStart(2, "0");
  return {
    hora: `${dos(Math.floor(redondeada / 60))}:${dos(redondeada % 60)}`,
    dias: minutos.length,
  };
}

// "Sueles tardar un 40 % más de lo que calculas."
export function textoFactor(factor: number): string {
  const diferencia = Math.round(Math.abs(factor - 1) * 100);
  if (diferencia < 10) return "Calculas bien lo que tardas.";
  if (factor > 1)
    return factor >= 2
      ? `Sueles tardar unas ${String(factor).replace(".", ",")} veces lo que calculas.`
      : `Sueles tardar un ${diferencia} % más de lo que calculas.`;
  return `Sueles acabar antes de lo que calculas (un ${diferencia} % menos).`;
}

export function conocerte(d: {
  factores: Partial<Record<TipoTarea, Factor>>;
  resumen: ResumenProgreso;
  horas: HorasDelDia[];
  sesiones: SesionConHora[];
  horaLocal: (instante: string) => string; // "2026-10-30T15:00:00Z" → "16:00"
  diasDificiles: Motivo[];
}): { rasgos: Rasgo[]; pendientes: Pendiente[] } {
  const rasgos: Rasgo[] = [];
  const pendientes: Pendiente[] = [];

  // ---- Lo que tardas ----
  const tareas = d.factores.tarea;
  if (tareas)
    rasgos.push({
      id: "ritmo",
      titulo: "Lo que tardas",
      texto: textoFactor(tareas.factor),
      deDonde: `Según tus últimas ${tareas.muestras} tareas con «¿Cuánto has tardado?». El aviso de «No te cabe» ya lo tiene en cuenta.`,
    });
  else
    pendientes.push({
      id: "ritmo",
      texto: `Lo que tardas de verdad: cuando marques ${MIN_MUESTRAS} tareas como hechas diciendo cuánto has tardado.`,
    });
  const entregas = d.factores.entrega;
  if (entregas)
    rasgos.push({
      id: "entregas",
      titulo: "Las entregas",
      texto: textoFactor(entregas.factor),
      deDonde: `Según tus últimas ${entregas.muestras} entregas terminadas.`,
    });

  // ---- Sueño y horario ----
  const sueno = d.resumen.sueno;
  if (sueno.media !== null && sueno.dias >= MIN_DIAS)
    rasgos.push({
      id: "sueno",
      titulo: "Tu sueño",
      texto: `Duermes unas ${textoDuracion(sueno.media)} de media.`,
      deDonde: `Según ${sueno.dias} noches de las últimas 4 semanas (con «Me voy a dormir» y «Despierto»).`,
      corregir: { href: "/areas/progreso", texto: "Ver tu progreso" },
    });
  else
    pendientes.push({
      id: "sueno",
      texto: `Cuánto duermes: cuando uses «Me voy a dormir» y «Despierto» unos ${MIN_DIAS} días.`,
    });

  const levantado = horaMedia(d.horas.map((h) => h.levantado));
  const acostarse = horaMedia(
    d.horas.filter((h) => h.acostarseReal).map((h) => h.acostarse),
    true,
  );
  const partes: string[] = [];
  if (levantado && levantado.dias >= MIN_DIAS)
    partes.push(`te levantas hacia las ${levantado.hora}`);
  if (acostarse && acostarse.dias >= MIN_DIAS)
    partes.push(`te acuestas hacia las ${acostarse.hora}`);
  if (partes.length > 0)
    rasgos.push({
      id: "horario",
      titulo: "Tu horario",
      texto: `Normalmente ${partes.join(" y ")}.`,
      deDonde:
        "Es la media de los días que lo apuntaste. Si tu horario de Ajustes es otro, puedes cambiarlo allí.",
      corregir: { href: "/ajustes", texto: "Ir a Ajustes" },
    });
  else
    pendientes.push({
      id: "horario",
      texto: `A qué hora te levantas y te acuestas: cuando pulses «Levantado» y «Me voy a dormir» unos ${MIN_DIAS} días.`,
    });

  // ---- Cuándo te concentras ----
  const porFranja: Record<Franja, number> = { mañana: 0, tarde: 0, noche: 0 };
  for (const s of d.sesiones)
    porFranja[franjaDe(d.horaLocal(s.started_at))] += s.minutes;
  const totalFoco = porFranja.mañana + porFranja.tarde + porFranja.noche;
  if (totalFoco >= MIN_FOCO && d.sesiones.length >= MIN_SESIONES) {
    const [mejor, minutos] = (
      Object.entries(porFranja) as [Franja, number][]
    ).sort((a, b) => b[1] - a[1])[0];
    const parte = Math.round((minutos / totalFoco) * 100);
    rasgos.push({
      id: "foco",
      titulo: "Cuándo te concentras",
      texto:
        parte >= 50
          ? `Te concentras más por la ${mejor}: ahí va el ${parte} % de tu tiempo de Foco.`
          : "Tu tiempo de Foco está repartido a lo largo del día.",
      deDonde: `Según ${d.sesiones.length} sesiones de Foco (${textoDuracion(totalFoco)}) de las últimas 4 semanas.`,
    });
  } else
    pendientes.push({
      id: "foco",
      texto: `Cuándo te concentras mejor: cuando lleves unas ${MIN_SESIONES} sesiones de Foco.`,
    });

  // ---- Días difíciles ----
  if (d.diasDificiles.length >= 2) {
    const cuantos = new Map<Motivo, number>();
    for (const m of d.diasDificiles) cuantos.set(m, (cuantos.get(m) ?? 0) + 1);
    const [motivo, veces] = [...cuantos].sort((a, b) => b[1] - a[1])[0];
    rasgos.push({
      id: "dias-dificiles",
      titulo: "Los días difíciles",
      texto:
        veces >= 2
          ? `Has tenido ${d.diasDificiles.length} en las últimas 4 semanas. Lo que más se repite: «${MOTIVOS[motivo]}».`
          : `Has tenido ${d.diasDificiles.length} en las últimas 4 semanas, cada uno por algo distinto.`,
      deDonde: "Según las veces que usaste «Día difícil».",
    });
  }

  return { rasgos, pendientes };
}
