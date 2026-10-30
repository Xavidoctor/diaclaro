import type { MensajeIA } from "./groq-tipos";

// Etapa 8 (IA 2, parte 3): resumir las notas de un proyecto cuando tú lo
// pides. Función pura, con pruebas en resumir-notas.test.ts.
//
// Tus notas solo se envían a la IA al pulsar «Resumir con IA», y solo las de
// ese proyecto. La IA no guarda nada: el resumen se enseña y ya está.

export const MAX_NOTAS_RESUMEN = 40;
export const MAX_CARACTERES_RESUMEN = 8000;

const INSTRUCCIONES = `Eres el asistente de DíaClaro, una app de organización personal.
Te paso las notas que la persona ha apuntado en un proyecto o asignatura.
Escribe en español de España, claro y breve:
1. Un resumen de 3 a 6 frases de lo que dicen las notas.
2. Debajo, una lista corta (con guiones) de ideas que se repiten o se relacionan entre sí.
3. Si hay preguntas o cosas pendientes en las notas, una lista corta con ellas.
Usa SOLO lo que dicen las notas: no añadas datos, fechas ni tareas que no estén.
No uses títulos ni negritas.`;

// Las notas van de la más nueva a la más vieja. Si no caben todas, se
// mandan las más nuevas y se avisa de cuántas se han quedado fuera.
export function mensajesResumirNotas(d: {
  proyecto: string;
  notas: string[];
}): { mensajes: MensajeIA[]; incluidas: number } {
  const elegidas: string[] = [];
  let total = 0;
  for (const nota of d.notas.slice(0, MAX_NOTAS_RESUMEN)) {
    const texto = nota.trim();
    if (!texto) continue;
    if (total + texto.length > MAX_CARACTERES_RESUMEN && elegidas.length > 0)
      break;
    const recortada = texto.slice(0, MAX_CARACTERES_RESUMEN);
    elegidas.push(recortada);
    total += recortada.length;
  }
  return {
    incluidas: elegidas.length,
    mensajes: [
      { role: "system", content: INSTRUCCIONES },
      {
        role: "user",
        content: [
          `Proyecto: ${d.proyecto}`,
          ...elegidas.map((n, i) => `Nota ${i + 1}:\n"""${n}"""`),
        ].join("\n\n"),
      },
    ],
  };
}
