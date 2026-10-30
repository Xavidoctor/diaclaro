import type { MensajeIA } from "./groq-tipos";
import { textoDuracion } from "../planner/carga";
import type { PropuestaRecortes } from "../planner/recortes";

// Prepara lo que se le manda a la IA para que te explique el día con palabras.
// Función pura, con pruebas en explicar-carga.test.ts.
//
// Datos mínimos: solo títulos y minutos de lo de hoy, los recortes que ya ha
// calculado la app y tu hora de acostarte. Nada de notas, hábitos ni salud.
// Los números los calcula la app: la IA solo los explica, no los cambia.

export type DatosExplicacion = {
  apuntado: number;
  libre: number;
  diferencia: number; // negativo si te pasas
  horaAcostarse: string;
  sinDuracion: number;
  tareas: {
    title: string;
    minutos: number | null;
    importancia: string | null;
  }[];
  propuesta: PropuestaRecortes | null;
};

export const MAX_TAREAS_IA = 30;

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal.
Escribe en español de España, con frases cortas, tono cercano y sin juzgar.
Explica en 3 a 5 frases si el día cabe o no, y qué recortes conviene aceptar.
Usa SOLO los números y recortes que te doy: no inventes horas, fechas, duraciones ni tareas.
Si hay cosas sin minutos, recuerda que el cálculo puede quedarse corto.
No uses listas, títulos ni formato Markdown.`;

export function mensajesExplicarCarga(d: DatosExplicacion): MensajeIA[] {
  const lineas = [
    d.diferencia < 0
      ? `Hoy se pasa unos ${textoDuracion(-d.diferencia)}.`
      : `Hoy le cabe todo y le sobran ${textoDuracion(d.diferencia)}.`,
    `Le quedan ${textoDuracion(d.apuntado)} por hacer y ${textoDuracion(d.libre)} hasta las ${d.horaAcostarse} (sin contar comidas ni descansos).`,
  ];
  if (d.sinDuracion > 0)
    lineas.push(`Hay ${d.sinDuracion} cosas de hoy sin minutos.`);

  const tareas = d.tareas.slice(0, MAX_TAREAS_IA);
  if (tareas.length > 0) {
    lineas.push("Tareas de hoy:");
    for (const t of tareas) {
      const partes = [t.minutos ? `${t.minutos} min` : "sin minutos"];
      if (t.importancia) partes.push(`importancia ${t.importancia}`);
      lineas.push(`- ${t.title} (${partes.join(", ")})`);
    }
  }

  const recortes = d.propuesta?.recortes ?? [];
  if (recortes.length > 0) {
    lineas.push("Recortes que propone la app:");
    for (const r of recortes) {
      lineas.push(
        r.tipo === "aplazar"
          ? `- Pasar "${r.titulo}" a mañana (libera ${textoDuracion(r.ahorro)}). Motivo: ${r.motivo}.`
          : `- Dejar "${r.titulo}" en ${textoDuracion(r.nuevosMinutos)} (libera ${textoDuracion(r.ahorro)}). Motivo: ${r.motivo}.`,
      );
    }
    if (d.propuesta && d.propuesta.faltan > 0)
      lineas.push(
        `Aun con los recortes faltarían ${textoDuracion(d.propuesta.faltan)}: lo que queda es importante o tiene fecha fija.`,
      );
  }

  return [
    { role: "system", content: INSTRUCCIONES },
    { role: "user", content: lineas.join("\n") },
  ];
}
