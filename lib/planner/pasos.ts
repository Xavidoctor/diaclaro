// Pasos de una tarea dividida: lo que tú has revisado antes de guardar.
// Funciones puras, con pruebas en pasos.test.ts.

export const MAX_PASOS_GUARDAR = 8;
const MAX_TITULO = 200;

// Convierte el cuadro de texto (un paso por línea) en títulos de tarea.
// Quita los números del principio, las líneas vacías y lo que sobre.
export function prepararPasos(texto: unknown): string[] {
  if (typeof texto !== "string") return [];
  return texto
    .split("\n")
    .map((linea) =>
      linea
        .replace(/^\s*(\d+\s*[.)\-:]|[-•*])\s*/, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_TITULO),
    )
    .filter(Boolean)
    .slice(0, MAX_PASOS_GUARDAR);
}

// Lo que se ve en la caja de texto antes de guardar: «1. Abrir…», uno por línea.
export function textoPasos(pasos: string[]): string {
  return pasos.map((p, i) => `${i + 1}. ${p}`).join("\n");
}

// La descripción de cada paso guardado, para saber de dónde viene.
export function detallePaso(numero: number, total: number, tarea: string) {
  return `Paso ${numero} de ${total} de «${tarea}».`;
}
