import { z } from "zod";
import { CODIGOS, crearRegla, textoOpcional } from "./agenda";
import type { Resultado } from "./bandeja";
import { startOfWeek, format, parseISO } from "date-fns";
import { sumarDias } from "./fechas";
import { tocaRutina, type RegistroRutina } from "./rutinas";

// Reglas de los Hábitos. Funciones puras, con pruebas en habitos.test.ts.
//
// Un hábito es algo que quieres observar: hacerlo más (ejercicio), hacerlo
// menos (tabaco) o solo verlo (horas de sueño). Cada vez que pasa, lo apuntas.
// La app no juzga: no hay rachas que se rompen, ni colores de "mal", ni
// sermones. Solo datos para ti. Y estos datos nunca se envían a la IA.

export const DIRECCIONES = ["mas", "menos", "observar"] as const;
export type Direccion = (typeof DIRECCIONES)[number];

export const NOMBRE_DIRECCION: Record<Direccion, string> = {
  mas: "Quiero hacerlo más",
  menos: "Quiero hacerlo menos",
  observar: "Solo quiero verlo",
};

export type Habito = {
  id: string;
  title: string;
  notes: string | null;
  direction: Direccion;
  unit: string | null; // "cigarrillos", "minutos"... null = veces
  daily_target: number | null; // null = sin meta
  repeat_rule: string | null; // qué días toca; null = todos los días
  // Rutina unida: cada «Hecho» de la rutina cuenta como 1. null = sin unir.
  routine_id: string | null;
  active: boolean;
};

export type RegistroHabito = {
  habit_id: string;
  on_date: string;
  amount: number;
};

// Ideas para empezar. Solo rellenan el formulario: no se crea nada
// hasta que tú lo guardas, y nunca traen metas puestas.
export const IDEAS = {
  tabaco: { title: "Tabaco", direction: "menos", unit: "cigarrillos" },
  ejercicio: { title: "Ejercicio", direction: "mas", unit: "minutos" },
  sueno: { title: "Sueño", direction: "observar", unit: "horas" },
  movil: { title: "Móvil", direction: "menos", unit: "horas" },
  agua: { title: "Agua", direction: "mas", unit: "vasos" },
} as const satisfies Record<
  string,
  { title: string; direction: Direccion; unit: string }
>;
export type Idea = keyof typeof IDEAS;

export function esIdea(valor: unknown): valor is Idea {
  return typeof valor === "string" && Object.hasOwn(IDEAS, valor);
}

// ¿Toca este hábito ese día? Mismas reglas de días que las rutinas.
export function tocaHabito(
  habito: Pick<Habito, "repeat_rule">,
  fecha: string,
): boolean {
  return tocaRutina(habito, fecha);
}

// Lo apuntado ese día. null = no has apuntado nada (no es lo mismo que 0).
export function totalDelDia(
  registros: RegistroHabito[],
  habitoId: string,
  fecha: string,
): number | null {
  const delDia = registros.filter(
    (r) => r.habit_id === habitoId && r.on_date === fecha,
  );
  if (delDia.length === 0) return null;
  return delDia.reduce((suma, r) => suma + r.amount, 0);
}

export type HabitoDelDia = { habito: Habito; total: number | null };

// Los hábitos activos que tocan ese día, con lo apuntado.
export function habitosDelDia(
  habitos: Habito[],
  registros: RegistroHabito[],
  fecha: string,
): HabitoDelDia[] {
  return habitos
    .filter((h) => h.active && tocaHabito(h, fecha))
    .map((habito) => ({
      habito,
      total: totalDelDia(registros, habito.id, fecha),
    }));
}

// "8,5": un decimal como mucho, con coma.
export function numero(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  });
}

// "3 cigarrillos", "1 vez", "2 veces".
export function textoCantidad(n: number, unidad: string | null): string {
  if (unidad) return `${numero(n)} ${unidad}`;
  return n === 1 ? "1 vez" : `${numero(n)} veces`;
}

// "Meta: como mucho 10 cigarrillos al día", o lo que quieres si no hay meta.
export function textoMeta(
  h: Pick<Habito, "direction" | "daily_target" | "unit">,
): string {
  if (h.daily_target === null || h.direction === "observar")
    return NOMBRE_DIRECCION[h.direction];
  const cantidad = textoCantidad(h.daily_target, h.unit);
  return h.direction === "menos"
    ? `Meta: como mucho ${cantidad} al día`
    : `Meta: al menos ${cantidad} al día`;
}

// ¿Ese día quedó dentro de la meta? null si no hay meta o no apuntaste nada.
export function dentroDeMeta(
  h: Pick<Habito, "direction" | "daily_target">,
  total: number | null,
): boolean | null {
  if (total === null || h.daily_target === null) return null;
  if (h.direction === "menos") return total <= h.daily_target;
  if (h.direction === "mas") return total >= h.daily_target;
  return null;
}

export type ResumenSemana = {
  // Los últimos 7 días (el último es hoy), con lo apuntado o null.
  dias: { fecha: string; total: number | null }[];
  diasConApuntes: number;
  // Media de los días con algo apuntado. null si no hay ninguno.
  media: number | null;
  mediaAnterior: number | null; // la de los 7 días de antes
  diasEnMeta: number | null; // null si no hay meta
};

function media(totales: (number | null)[]): number | null {
  const con = totales.filter((t): t is number => t !== null);
  if (con.length === 0) return null;
  return con.reduce((a, b) => a + b, 0) / con.length;
}

// Resumen sencillo de la última semana. Los días sin apuntar no cuentan
// (ni como 0 ni como fallo): solo sabemos lo que tú apuntas.
export function resumenSemana(
  habito: Pick<Habito, "id" | "direction" | "daily_target">,
  registros: RegistroHabito[],
  hoy: string,
): ResumenSemana {
  const totales = (desde: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(hoy, desde + i);
      return { fecha, total: totalDelDia(registros, habito.id, fecha) };
    });
  const dias = totales(-6);
  const anteriores = totales(-13);
  const enMeta = dias.map((d) => dentroDeMeta(habito, d.total));
  return {
    dias,
    diasConApuntes: dias.filter((d) => d.total !== null).length,
    media: media(dias.map((d) => d.total)),
    mediaAnterior: media(anteriores.map((d) => d.total)),
    diasEnMeta:
      habito.daily_target === null || habito.direction === "observar"
        ? null
        : enMeta.filter((e) => e === true).length,
  };
}

// Frase neutra que compara con la semana anterior, o null si faltan datos.
// Solo describe; si vas hacia donde querías, lo dice, y si no, no dice nada más.
export function textoTendencia(
  resumen: Pick<ResumenSemana, "media" | "mediaAnterior">,
  direccion: Direccion,
): string | null {
  const { media: ahora, mediaAnterior: antes } = resumen;
  if (ahora === null || antes === null) return null;
  const cifras = `(${numero(antes)} → ${numero(ahora)} al día de media)`;
  // Diferencias pequeñas cuentan como "parecido".
  if (Math.abs(ahora - antes) < Math.max(0.5, antes * 0.1))
    return `Parecido a la semana anterior ${cifras}`;
  const bajo = ahora < antes;
  const haciaDondeQuieres =
    (bajo && direccion === "menos") || (!bajo && direccion === "mas");
  return `${bajo ? "Menos" : "Más"} que la semana anterior ${cifras}${
    haciaDondeQuieres ? ". Vas hacia donde querías." : ""
  }`;
}

// Convierte los «Hecho» de las rutinas unidas en apuntes de sus hábitos
// (1 por cada vez). Así no hace falta apuntar lo mismo dos veces.
export function apuntesDeRutinas(
  habitos: Pick<Habito, "id" | "routine_id">[],
  registros: RegistroRutina[],
): RegistroHabito[] {
  return habitos.flatMap((h) =>
    h.routine_id
      ? registros
          .filter((r) => r.routine_id === h.routine_id)
          .map((r) => ({ habit_id: h.id, on_date: r.on_date, amount: 1 }))
      : [],
  );
}

// El lunes de la semana de ese día, como "2026-10-26".
export function lunesDe(fecha: string): string {
  return format(
    startOfWeek(parseISO(fecha), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}

export type ResumenDeSemana = {
  lunes: string;
  dias: number; // días que cuentan (la semana actual puede ir por la mitad)
  diasConApuntes: number;
  total: number;
  media: number | null; // de los días con apuntes
  diasEnMeta: number | null; // null si no hay meta
};

// Resumen de las últimas semanas (de lunes a domingo), de la más nueva a la más vieja.
// La semana actual cuenta solo hasta hoy. Los días sin apuntar no cuentan.
export function resumenPorSemanas(
  habito: Pick<Habito, "id" | "direction" | "daily_target">,
  registros: RegistroHabito[],
  hoy: string,
  semanas: number,
): ResumenDeSemana[] {
  const conMeta =
    habito.daily_target !== null && habito.direction !== "observar";
  const lunesActual = lunesDe(hoy);
  return Array.from({ length: semanas }, (_, i) => {
    const lunes = sumarDias(lunesActual, -7 * i);
    const fechas = Array.from({ length: 7 }, (_, d) =>
      sumarDias(lunes, d),
    ).filter((f) => f <= hoy);
    const totales = fechas.map((f) => totalDelDia(registros, habito.id, f));
    const con = totales.filter((t): t is number => t !== null);
    return {
      lunes,
      dias: fechas.length,
      diasConApuntes: con.length,
      total: con.reduce((a, b) => a + b, 0),
      media: media(totales),
      diasEnMeta: conMeta
        ? totales.filter((t) => dentroDeMeta(habito, t) === true).length
        : null,
    };
  });
}

// Cuántas semanas se ven en el historial: 4 (un mes), 13 (tres meses) o 26 (seis).
export const OPCIONES_SEMANAS = [4, 13, 26] as const;
export function leerSemanas(valor: unknown): number {
  const n = Number(valor);
  return (OPCIONES_SEMANAS as readonly number[]).includes(n) ? n : 4;
}

// ---- Formularios ----

const numeroOpcional = textoOpcional
  .transform((v) => (v === null ? null : Number(v)))
  .pipe(
    z
      .number({ error: "La meta tiene que ser un número." })
      .int("La meta tiene que ser un número entero.")
      .min(0, "La meta no puede ser negativa.")
      .max(1000, "Como mucho 1000.")
      .nullable(),
  );

const esquemaHabito = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Ponle un nombre (por ejemplo, Tabaco o Ejercicio).")
      .max(100, "Como mucho 100 caracteres."),
    notes: textoOpcional.pipe(
      z.string().max(2000, "Las notas admiten 2000 caracteres.").nullable(),
    ),
    direction: z.enum(DIRECCIONES, { error: "Elige qué quieres hacer." }),
    unit: textoOpcional.pipe(
      z.string().max(30, "La unidad admite 30 caracteres.").nullable(),
    ),
    daily_target: numeroOpcional,
    cuando: z.enum(["todos", "algunos"], { error: "Elige qué días toca." }),
    dias: z.array(z.enum(CODIGOS)),
    routine_id: textoOpcional.pipe(
      z.uuid({ error: "Esa rutina no es válida." }).nullable(),
    ),
  })
  .superRefine((d, ctx) => {
    if (d.cuando === "algunos" && d.dias.length === 0)
      ctx.addIssue({ code: "custom", message: "Marca qué días toca." });
  });

export type DatosHabito = Omit<Habito, "id" | "active">;

export function prepararHabito(datos: {
  title: unknown;
  notes: unknown;
  direction: unknown;
  unit: unknown;
  daily_target: unknown;
  cuando: unknown;
  dias: unknown[];
  routine_id?: unknown;
}): Resultado<DatosHabito> {
  const r = esquemaHabito.safeParse({
    title: datos.title ?? "",
    notes: datos.notes ?? "",
    direction: datos.direction ?? "observar",
    unit: datos.unit ?? "",
    daily_target: datos.daily_target ?? "",
    cuando: datos.cuando ?? "todos",
    dias: datos.dias,
    routine_id: datos.routine_id ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const d = r.data;
  return {
    ok: true,
    valor: {
      title: d.title,
      routine_id: d.routine_id,
      notes: d.notes,
      direction: d.direction,
      unit: d.unit,
      // Si solo quieres verlo, no hay meta.
      daily_target: d.direction === "observar" ? null : d.daily_target,
      repeat_rule:
        d.cuando === "todos"
          ? null
          : crearRegla({
              tipo: "semanal",
              dias: CODIGOS.filter((c) => d.dias.includes(c)),
              hasta: null,
            }),
    },
  };
}

const esquemaApunte = z.object({
  amount: textoOpcional
    .transform((v) => (v === null ? 1 : Number(v)))
    .pipe(
      z
        .number({ error: "La cantidad tiene que ser un número." })
        .int("La cantidad tiene que ser un número entero.")
        .min(0, "La cantidad no puede ser negativa.")
        .max(1000, "Como mucho 1000 de una vez."),
    ),
  note: textoOpcional.pipe(
    z.string().max(500, "La nota admite 500 caracteres.").nullable(),
  ),
});

export type DatosApunte = z.infer<typeof esquemaApunte>;

// Un apunte: cuánto (vacío = 1) y una nota opcional.
export function prepararApunte(datos: {
  amount: unknown;
  note: unknown;
}): Resultado<DatosApunte> {
  const r = esquemaApunte.safeParse({
    amount: datos.amount ?? "",
    note: datos.note ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}
