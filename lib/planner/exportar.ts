// Reglas de la copia de seguridad. Funciones puras, con pruebas en exportar.test.ts.
//
// La copia es un archivo JSON con todas tus filas de cada tabla. JSON es texto
// normal: lo puedes abrir con cualquier editor y no depende de DíaClaro.

// Las tablas que se copian, en este orden. Al añadir una tabla nueva, añádela aquí.
export const TABLAS = [
  "settings",
  "areas",
  "projects",
  "project_goals",
  "notes",
  "tasks",
  "events",
  "event_exceptions",
  "routines",
  "routine_logs",
  "focus_sessions",
  "day_reviews",
  "day_starts",
  "bedtimes",
  "hard_days",
  "job_applications",
  "job_application_events",
  "habits",
  "habit_logs",
  "project_documents",
] as const;
export type Tabla = (typeof TABLAS)[number];

// Columnas que la base de datos calcula sola: no hace falta guardarlas.
const CALCULADAS: Partial<Record<Tabla, string[]>> = {
  notes: ["search"],
};

export const VERSION_COPIA = 1;

export type Copia = {
  app: "DíaClaro";
  version: number;
  exportada_el: string;
  // Tablas que no se han podido copiar (por ejemplo, porque aún no existen).
  avisos: string[];
  tablas: Partial<Record<Tabla, Record<string, unknown>[]>>;
};

export function armarCopia(
  filas: Partial<Record<Tabla, Record<string, unknown>[]>>,
  avisos: string[],
  ahora: Date,
): Copia {
  const tablas: Copia["tablas"] = {};
  for (const tabla of TABLAS) {
    const lista = filas[tabla];
    if (!lista) continue;
    const quitar = CALCULADAS[tabla] ?? [];
    tablas[tabla] = lista.map((fila) =>
      Object.fromEntries(
        Object.entries(fila).filter(([columna]) => !quitar.includes(columna)),
      ),
    );
  }
  return {
    app: "DíaClaro",
    version: VERSION_COPIA,
    exportada_el: ahora.toISOString(),
    avisos,
    tablas,
  };
}

// "diaclaro-copia-2026-10-30.json"
export function nombreArchivo(dia: string): string {
  return `diaclaro-copia-${dia}.json`;
}

// Cuántas filas hay en cada tabla (para el resumen en Ajustes).
export function contarFilas(copia: Copia): number {
  return Object.values(copia.tablas).reduce(
    (total, filas) => total + (filas?.length ?? 0),
    0,
  );
}
