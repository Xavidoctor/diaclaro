import { z } from "zod";

// Cambios hechos sin internet: marcar una tarea como hecha, editar una
// tarea o una nota, añadir una tarea a un día, apuntar un hábito o marcar
// una rutina como hecha. Se guardan en el móvil (localStorage) y se envían en
// orden al volver la red. Si alguno no se puede aplicar porque esa cosa se
// cambió en otro aparato mientras tanto, pasa a «Revisa este cambio».
// Aquí solo están las reglas; guardar y enviar lo hace
// app/componentes/cambios-sin-conexion.ts.
// (Las notas y tareas nuevas van por su propia cola: cola-sin-conexion.ts.)

export const CLAVE_CAMBIOS = "diaclaro:cambios-pendientes";
export const CLAVE_REVISAR = "diaclaro:cambios-revisar";
export const CLAVE_ULTIMA_CONEXION = "diaclaro:ultima-conexion";

const base = {
  id: z.string().min(1),
  creado: z.string(), // cuándo lo hiciste (hora del móvil, ISO)
  // Última vez que este aparato tenía internet: si la cosa cambió después,
  // la cambió otro aparato y hay que revisarlo.
  vista: z.string(),
};

export const esquemaCambio = z.discriminatedUnion("tipo", [
  z.object({
    ...base,
    tipo: z.literal("tarea-hecha"),
    tareaId: z.string().min(1),
    titulo: z.string(),
    minutos: z.number().int().min(1).max(1440).nullable(),
  }),
  z.object({
    ...base,
    tipo: z.literal("editar-nota"),
    notaId: z.string().min(1),
    texto: z.string().min(1).max(10000),
    tipoNota: z.string().max(40).optional(),
    etiquetas: z.string().max(500).optional(),
  }),
  z.object({
    ...base,
    tipo: z.literal("editar-tarea"),
    tareaId: z.string().min(1),
    // Los campos del formulario tal cual (título, fecha, hora...): al volver
    // la red se guardan con la misma acción que con internet.
    campos: z.record(z.string(), z.string().max(10000)),
  }),
  z.object({
    ...base,
    tipo: z.literal("nueva-tarea"),
    campos: z.record(z.string(), z.string().max(10000)),
  }),
  z.object({
    ...base,
    tipo: z.literal("rutina-hecha"),
    rutinaId: z.string().min(1),
    titulo: z.string(),
    vez: z.number().int().min(1).max(20).nullable(), // qué vez del día
    dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // fecha del móvil
  }),
  z.object({
    ...base,
    tipo: z.literal("apunte-habito"),
    habitoId: z.string().min(1),
    dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // fecha del móvil
    cantidad: z.string().max(20),
    nota: z.string().max(500),
  }),
]);

export type Cambio = z.infer<typeof esquemaCambio>;

// Lo que contesta el servidor al intentar aplicar un cambio.
export type Resultado =
  | { estado: "ok" }
  | { estado: "cambiado"; ahora: string } // otro aparato lo cambió antes
  | { estado: "no-existe" } // se borró mientras tanto
  | { estado: "error" }; // no se pudo (sin red, sin sesión...): se reintenta

export const esquemaRevision = z.object({
  cambio: esquemaCambio,
  motivo: z.enum(["cambiado", "no-existe"]),
  ahora: z.string().optional(), // cómo está ahora en DíaClaro
});

export type Revision = z.infer<typeof esquemaRevision>;

function leerLista<T>(json: string | null, esquema: z.ZodType<T>): T[] {
  if (!json) return [];
  try {
    const r = z.array(esquema).safeParse(JSON.parse(json));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

export function leerCambios(json: string | null): Cambio[] {
  return leerLista(json, esquemaCambio);
}

export function leerRevisiones(json: string | null): Revision[] {
  return leerLista(json, esquemaRevision);
}

// Añade un cambio. Si ya había otro igual pendiente sobre lo mismo
// (por ejemplo, editaste la misma nota dos veces), se queda solo el último.
export function anadirCambio(lista: Cambio[], nuevo: Cambio): Cambio[] {
  if (nuevo.tipo === "editar-nota") {
    return [
      ...lista.filter((c) => !(c.tipo === "editar-nota" && c.notaId === nuevo.notaId)),
      nuevo,
    ];
  }
  if (nuevo.tipo === "editar-tarea") {
    return [
      ...lista.filter((c) => !(c.tipo === "editar-tarea" && c.tareaId === nuevo.tareaId)),
      nuevo,
    ];
  }
  if (nuevo.tipo === "tarea-hecha") {
    return [
      ...lista.filter((c) => !(c.tipo === "tarea-hecha" && c.tareaId === nuevo.tareaId)),
      nuevo,
    ];
  }
  return [...lista, nuevo];
}

// ¿Esa cosa se cambió en DíaClaro después de que este aparato perdiera la red?
export function cambiadoDespues(actualizado: string, vista: string): boolean {
  const a = new Date(actualizado).getTime();
  const v = new Date(vista).getTime();
  if (Number.isNaN(a) || Number.isNaN(v)) return false;
  return a > v;
}

// El día en que se apunta un hábito hecho sin conexión.
// Si se envía el mismo día del reloj, vale «tu día de hoy» (que puede seguir
// siendo ayer si aún no has pulsado «Me voy a dormir»). Si se envía otro día,
// vale la fecha del móvil, pero nunca en el futuro ni de hace más de 3 días.
export function diaDelApunte(
  diaMovil: string,
  hoy: { dia: string; calendario: string },
): string | null {
  if (diaMovil === hoy.calendario) return hoy.dia;
  if (diaMovil > hoy.calendario) return null;
  const limite = new Date(`${hoy.calendario}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 3);
  return diaMovil >= limite.toISOString().slice(0, 10) ? diaMovil : null;
}

// Frase corta para la lista de «Revisa este cambio».
export function describirCambio(c: Cambio): string {
  switch (c.tipo) {
    case "tarea-hecha":
      return `Marcar como hecha: «${c.titulo}»`;
    case "editar-nota":
      return "Cambiar el texto de una nota";
    case "editar-tarea":
      return `Cambiar la tarea «${c.campos.title ?? ""}»`;
    case "nueva-tarea":
      return `Añadir la tarea «${c.campos.title ?? ""}»`;
    case "apunte-habito":
      return "Apuntar un hábito";
    case "rutina-hecha":
      return `Marcar como hecha la rutina «${c.titulo}»`;
  }
}

// Los campos de texto de un formulario (los archivos no se guardan).
export function camposDeFormulario(entradas: Iterable<[string, unknown]>): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const [clave, valor] of entradas) {
    if (typeof valor === "string" && !clave.startsWith("$ACTION")) campos[clave] = valor;
  }
  return campos;
}

// Fecha del móvil (AAAA-MM-DD), en su zona horaria.
export function fechaLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
