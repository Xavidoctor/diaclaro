// Etiquetas y tipos de nota. Funciones puras, con pruebas en etiquetas.test.ts.

export const TIPOS_NOTA = [
  "nota",
  "lista",
  "idea",
  "recordatorio",
  "apunte",
  "enlace",
] as const;

export type TipoNota = (typeof TIPOS_NOTA)[number];

export const NOMBRE_TIPO: Record<TipoNota, string> = {
  nota: "Nota",
  lista: "Lista",
  idea: "Idea",
  recordatorio: "Recordatorio",
  apunte: "Apunte",
  enlace: "Enlace",
};

export const MAX_ETIQUETAS = 20;
const MAX_LARGO_ETIQUETA = 30;

export function esTipoNota(valor: unknown): valor is TipoNota {
  return TIPOS_NOTA.includes(valor as TipoNota);
}

// Deja una etiqueta en su forma limpia: sin "#", en minúsculas y sin espacios
// (los espacios pasan a guiones). Devuelve null si no queda nada útil.
export function limpiarEtiqueta(valor: string): string | null {
  const limpia = valor
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, MAX_LARGO_ETIQUETA);
  return limpia.length > 0 ? limpia : null;
}

// Quita repetidas y vacías, y respeta el máximo.
function sinRepetir(etiquetas: (string | null)[]): string[] {
  const unicas = [...new Set(etiquetas.filter((e): e is string => !!e))];
  return unicas.slice(0, MAX_ETIQUETAS);
}

// Busca etiquetas escritas con "#" en el texto capturado:
// "mirar fundas #dropshipping" → ["dropshipping"]. El texto no se cambia.
export function extraerEtiquetas(texto: string): string[] {
  // No cuenta el "#" de un enlace (https://web.com/#seccion) porque exige
  // que antes haya un espacio o el inicio del texto.
  const encontradas = texto.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu);
  return sinRepetir([...encontradas].map((m) => limpiarEtiqueta(m[1])));
}

// Lo que escribes en el campo "Etiquetas" al editar: "ade, empleo #ia".
export function leerCampoEtiquetas(valor: unknown): string[] {
  if (typeof valor !== "string") return [];
  return sinRepetir(valor.split(/[,\s]+/).map(limpiarEtiqueta));
}

// Tipo con el que nace una nota: "enlace" si solo has pegado un enlace.
export function tipoInicial(texto: string, url: string | null): TipoNota {
  return url !== null && texto.trim() === url ? "enlace" : "nota";
}

// Cuántas notas tiene cada etiqueta, de más a menos usada.
export function contarEtiquetas(notas: { tags: string[] }[]) {
  const cuenta = new Map<string, number>();
  for (const nota of notas) {
    for (const etiqueta of nota.tags) {
      cuenta.set(etiqueta, (cuenta.get(etiqueta) ?? 0) + 1);
    }
  }
  return [...cuenta.entries()]
    .map(([etiqueta, cuantas]) => ({ etiqueta, cuantas }))
    .sort(
      (a, b) => b.cuantas - a.cuantas || a.etiqueta.localeCompare(b.etiqueta),
    );
}
