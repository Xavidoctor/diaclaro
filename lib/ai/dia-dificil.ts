import type { MensajeIA } from "./groq-tipos";
import { textoDuracion } from "../planner/carga";
import { MOTIVOS, type Motivo } from "../planner/dia-dificil";

// Etapa 8 (IA 2): el Día difícil asistido. Funciones puras, con pruebas en
// dia-dificil.test.ts.
//
// 1. Cuentas con tus palabras qué ha pasado y la IA elige el motivo que más
//    se parece (levantarte tarde, un imprevisto o falta de energía).
// 2. La IA te explica con palabras la propuesta que ya ha calculado la app.
// La IA no decide qué se conserva, se reduce o se aplaza: eso lo calcula
// siempre lib/planner/dia-dificil.ts, y nada cambia hasta que aceptas.

export const MAX_TEXTO_DIA = 500;
export const MAX_TAREAS_DIA = 30;

const INSTRUCCIONES_MOTIVO = `Eres el asistente de DíaClaro, una app de organización personal.
La persona cuenta por qué hoy es un día difícil. Elige el motivo que más se parece:
- "tarde": se ha levantado o empezado tarde.
- "imprevisto": ha surgido algo (una cita, un problema, alguien que necesita ayuda).
- "energia": está cansada, mal, sin ganas o sin fuerzas.
Responde SOLO con un objeto JSON: {"motivo":"tarde"}`;

export function mensajesElegirMotivo(texto: string): MensajeIA[] {
  return [
    { role: "system", content: INSTRUCCIONES_MOTIVO },
    {
      role: "user",
      content: `"""${texto.slice(0, MAX_TEXTO_DIA)}"""`,
    },
  ];
}

// Lee el motivo de la respuesta. Si no es uno de los tres, null.
export function leerMotivoIA(respuesta: string): Motivo | null {
  const encontrado = /"motivo"\s*:\s*"([a-z]+)"/i.exec(respuesta);
  const motivo = encontrado?.[1].toLowerCase();
  return motivo && motivo in MOTIVOS ? (motivo as Motivo) : null;
}

export type DatosExplicacionDia = {
  motivo: Motivo;
  agenda: string[]; // títulos de lo que hay en la agenda hoy
  rutinas: string[];
  conservar: { titulo: string; motivo: string }[];
  reducir: { titulo: string; de: number; a: number }[];
  aplazar: { titulo: string }[];
  ahorro: number;
};

const INSTRUCCIONES_EXPLICAR = `Eres el asistente de DíaClaro, una app de organización personal.
Hoy es un día difícil para la persona. Escribe en español de España, con frases cortas,
tono cálido y sin juzgar. En 3 a 5 frases explica qué conserva, qué reduce y qué deja para
mañana, y por qué así el día es más llevadero. Anímala sin exagerar.
Usa SOLO las tareas y los números que te doy: no inventes horas, fechas, duraciones ni tareas.
No uses listas, títulos ni formato Markdown.`;

// Datos mínimos: títulos y minutos de lo de hoy. Nada de notas, hábitos ni salud.
export function mensajesExplicarDia(d: DatosExplicacionDia): MensajeIA[] {
  const corta = <T>(lista: T[]) => lista.slice(0, MAX_TAREAS_DIA);
  const lineas = [`Motivo: ${MOTIVOS[d.motivo]}.`];
  if (d.agenda.length > 0)
    lineas.push(`Agenda de hoy (no se toca): ${corta(d.agenda).join("; ")}.`);
  if (d.rutinas.length > 0)
    lineas.push(
      `Rutinas de hoy (no se tocan): ${corta(d.rutinas).join("; ")}.`,
    );
  lineas.push(
    d.conservar.length > 0
      ? `Conserva: ${corta(d.conservar)
          .map((c) => `${c.titulo} (${c.motivo.toLowerCase()})`)
          .join("; ")}.`
      : "No hay tareas que conservar.",
  );
  if (d.reducir.length > 0)
    lineas.push(
      `Reduce: ${corta(d.reducir)
        .map(
          (r) =>
            `${r.titulo} (de ${textoDuracion(r.de)} a ${textoDuracion(r.a)})`,
        )
        .join("; ")}.`,
    );
  if (d.aplazar.length > 0)
    lineas.push(
      `Deja para mañana: ${corta(d.aplazar)
        .map((a) => a.titulo)
        .join("; ")}.`,
    );
  if (d.ahorro > 0)
    lineas.push(
      `Si acepta todo, hoy se quita unas ${textoDuracion(d.ahorro)}.`,
    );

  return [
    { role: "system", content: INSTRUCCIONES_EXPLICAR },
    { role: "user", content: lineas.join("\n") },
  ];
}
