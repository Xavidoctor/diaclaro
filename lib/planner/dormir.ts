import { horaOpcional } from "./agenda";

// "Me voy a dormir". Funciones puras, con pruebas en dormir.test.ts.
//
// Guardamos a qué hora te acuestas de verdad cada noche. La noche es la del
// día que terminas: si te acuestas a la 01:00 del sábado, sigue siendo la
// noche del viernes. Por eso cualquier hora antes de las 12:00 cuenta como
// pasada la medianoche (igual que al calcular el sueño en progreso.ts).

export const MEDIODIA = "12:00";

export type HoraDormir = {
  on_date: string; // el día que terminas, "2026-10-30"
  bed_time: string; // "23:40" o "01:10"
};

// A qué noche pertenece una hora: antes de las 12:00, a la del día anterior.
export function nocheDe(hoy: string, ayer: string, hora: string): string {
  return hora < MEDIODIA ? ayer : hoy;
}

// Lee la hora que llega del formulario. Aquí es obligatoria.
export function leerHoraDormir(
  valor: unknown,
): { ok: true; valor: string } | { ok: false; error: string } {
  const r = horaOpcional.safeParse(valor ?? "");
  if (!r.success) return { ok: false, error: "La hora no es válida." };
  if (r.data === null) return { ok: false, error: "Pon una hora." };
  return { ok: true, valor: r.data };
}

// "Te acostaste a las 23:40" / "Te acostaste a la 01:10".
export function textoAcostaste(hora: string): string {
  const articulo = hora.startsWith("01:") ? "a la" : "a las";
  return `Te acostaste ${articulo} ${hora}`;
}

// ---- «¿Por qué te acostaste más tarde?» ----

// Los motivos que se pueden elegir. Pocos a propósito: si no encaja ninguno,
// eliges «Otro» y lo escribes con tus palabras.
export const MOTIVOS_TARDE = [
  { valor: "pantallas", texto: "Móvil, series o juegos" },
  { valor: "trabajo", texto: "Trabajo o estudios" },
  { valor: "planes", texto: "Planes o amigos" },
  { valor: "no-podia", texto: "No podía dormir" },
  { valor: "otro", texto: "Otro" },
] as const;

export type MotivoTarde = (typeof MOTIVOS_TARDE)[number]["valor"];

export const MAX_NOTA_TARDE = 200;

// Lo que necesita el enlace «Anoche… · cambiar» de Hoy.
export type NocheParaCorregir = {
  hora: string | null; // la que guardaste, si la hay
  prevista: string | null; // la de ese día o la de Ajustes
  late_reason: MotivoTarde | null;
  late_note: string | null;
};

export function textoMotivo(motivo: MotivoTarde | null): string {
  return MOTIVOS_TARDE.find((m) => m.valor === motivo)?.texto ?? "Sin motivo";
}

// Una hora de acostarte en minutos, contando las de antes de las 12:00 como
// pasada la medianoche: "23:00" → 1380, "01:30" → 1530.
function minutosDeNoche(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  const minutos = h * 60 + m;
  return hora < MEDIODIA ? minutos + 24 * 60 : minutos;
}

// Cuántos minutos más tarde de lo previsto te acostaste (0 si no fue más tarde).
// Ejemplo: previsto 23:00 y te acostaste a la 01:30 → 150.
export function minutosTarde(prevista: string, real: string): number {
  return Math.max(0, minutosDeNoche(real) - minutosDeNoche(prevista));
}

// ¿Preguntamos el motivo? Si sabemos tu hora prevista, cuando la nueva es más
// tarde. Si no, cuando es más tarde que la que había guardada. Si no hay
// ninguna de las dos, siempre (es opcional).
export function preguntarMotivo({
  nueva,
  prevista,
  guardada,
}: {
  nueva: string;
  prevista: string | null;
  guardada: string | null;
}): boolean {
  if (!/^\d\d:\d\d$/.test(nueva)) return false;
  const referencia = prevista ?? guardada;
  return referencia === null || minutosTarde(referencia, nueva) > 0;
}

// Lee el motivo y la nota del formulario. Las dos cosas son opcionales.
export function leerMotivoTarde(
  motivo: unknown,
  nota: unknown,
): { late_reason: MotivoTarde | null; late_note: string | null } {
  const valido = MOTIVOS_TARDE.find((m) => m.valor === motivo);
  const texto =
    typeof nota === "string" ? nota.trim().slice(0, MAX_NOTA_TARDE) : "";
  return { late_reason: valido?.valor ?? null, late_note: texto || null };
}
