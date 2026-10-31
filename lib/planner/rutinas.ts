import { z } from "zod";
import {
  CODIGOS,
  FRANJAS,
  crearRegla,
  horaOpcional,
  revisarHoras,
  textoOpcional,
  tocaEseDia,
  type Franja,
} from "./agenda";
import type { Resultado } from "./bandeja";
import { enlaceOpcional } from "./enlaces";
import { sumarDias } from "./fechas";

// Reglas de las Rutinas. Funciones puras, con pruebas en rutinas.test.ts.
//
// Una rutina es algo que haces a menudo y con horario flexible, como pasear
// al perro. No tiene hora fija: como mucho, una franja ("entre 10:00 y 13:00"
// o "por la mañana"). Cada vez que la haces, la marcas y se apunta en el registro.

export type Rutina = {
  id: string;
  title: string;
  notes: string | null;
  repeat_rule: string | null; // qué días toca; null = todos los días
  times_per_day: number;
  duration_minutes: number | null;
  window_start: string | null;
  window_end: string | null;
  // Con varias veces al día: la hora de cada vez, en orden. null = sin horas.
  // Una vez sin hora se queda en null (la app no se la inventa).
  times_of_day: (string | null)[] | null;
  part_of_day: Franja | null;
  // Modo foco: al empezar, te pide alejar el móvil y puedes medir el tiempo.
  focus: boolean;
  // Con foco: minutos antes de la hora de inicio para avisarte. null = sin aviso.
  focus_alarm_minutes: number | null;
  active: boolean;
  // El proyecto (o asignatura) al que pertenece. Vacío = sin proyecto.
  project_id?: string | null;
  // Enlace para abrir desde Hoy (un podcast, una clase…). Vacío = sin enlace.
  url?: string | null;
};

// Los minutos que puedes elegir para el aviso antes de empezar.
export const MINUTOS_AVISO = [5, 10, 15, 30, 60] as const;

// slot = qué vez del día es (1, 2...). null en lo apuntado sin vez (antes de
// poder marcar cada vez, o desde Foco): cuenta como la primera que quedaba.
export type RegistroRutina = {
  routine_id: string;
  on_date: string;
  slot?: number | null;
};

// ¿Toca esta rutina ese día?
export function tocaRutina(
  rutina: Pick<Rutina, "repeat_rule">,
  fecha: string,
): boolean {
  if (!rutina.repeat_rule) return true;
  // La regla necesita un día de inicio: vale cualquiera de la semana anterior.
  return tocaEseDia(
    { start_date: sumarDias(fecha, -7), repeat_rule: rutina.repeat_rule },
    fecha,
  );
}

export type VezRutina = { numero: number; hora: string | null; hecha: boolean };

export type RutinaDelDia = {
  rutina: Rutina;
  hechas: number;
  completa: boolean;
  // Cada vez del día por separado, con su hora (si la tiene) y si está hecha.
  veces: VezRutina[];
};

// Las veces de una rutina en un día. Lo apuntado con su vez marca esa vez;
// lo apuntado sin vez rellena las primeras que quedaban.
export function vecesDeRutina(
  rutina: Pick<Rutina, "id" | "times_per_day" | "times_of_day">,
  registros: RegistroRutina[],
  fecha: string,
): VezRutina[] {
  const delDia = registros.filter(
    (g) => g.routine_id === rutina.id && g.on_date === fecha,
  );
  const veces = Array.from({ length: rutina.times_per_day }, (_, i) => ({
    numero: i + 1,
    hora: rutina.times_of_day?.[i] ?? null,
    hecha: delDia.some((g) => g.slot === i + 1),
  }));
  let sinVez = delDia.filter(
    (g) => !g.slot || g.slot > rutina.times_per_day,
  ).length;
  for (const vez of veces) {
    if (sinVez === 0) break;
    if (!vez.hecha) {
      vez.hecha = true;
      sinVez--;
    }
  }
  return veces;
}

// Las rutinas activas que tocan ese día, con cuántas veces las llevas.
// Primero las pendientes; dentro de cada grupo, por franja.
export function rutinasDelDia(
  rutinas: Rutina[],
  registros: RegistroRutina[],
  fecha: string,
): RutinaDelDia[] {
  return rutinas
    .filter((r) => r.active && tocaRutina(r, fecha))
    .map((rutina) => {
      const hechas = registros.filter(
        (g) => g.routine_id === rutina.id && g.on_date === fecha,
      ).length;
      return {
        rutina,
        hechas,
        completa: hechas >= rutina.times_per_day,
        veces: vecesDeRutina(rutina, registros, fecha),
      };
    })
    .sort(
      (a, b) =>
        Number(a.completa) - Number(b.completa) ||
        claveFranja(a.rutina).localeCompare(claveFranja(b.rutina)) ||
        a.rutina.title.localeCompare(b.rutina.title, "es"),
    );
}

// Lo que sale en la lista de Hoy: una fila por rutina o, si se hace varias
// veces al día, una fila por cada vez (cada una con su «Hecho»).
// Primero lo pendiente; dentro de cada grupo, por hora.
export type FilaRutinaHoy = {
  item: RutinaDelDia;
  vez: VezRutina | null; // null = rutina de 1 vez al día
  hecha: boolean;
};

export function filasDeHoy(rutinas: RutinaDelDia[]): FilaRutinaHoy[] {
  const filas = rutinas.flatMap((item): FilaRutinaHoy[] =>
    item.rutina.times_per_day > 1
      ? item.veces.map((vez) => ({ item, vez, hecha: vez.hecha }))
      : [{ item, vez: null, hecha: item.completa }],
  );
  const clave = (f: FilaRutinaHoy) => f.vez?.hora ?? claveFranja(f.item.rutina);
  return filas.sort(
    (a, b) =>
      Number(a.hecha) - Number(b.hecha) ||
      clave(a).localeCompare(clave(b)) ||
      a.item.rutina.title.localeCompare(b.item.rutina.title, "es") ||
      (a.vez?.numero ?? 0) - (b.vez?.numero ?? 0),
  );
}

// Solo para ordenar: no es una hora que se muestre.
const ORDEN_FRANJA: Record<Franja, string> = {
  mañana: "06:00",
  tarde: "14:00",
  noche: "20:00",
};
function claveFranja(r: Rutina): string {
  if (r.window_start) return r.window_start;
  const primera = r.times_of_day?.find((h) => h !== null);
  if (primera) return primera;
  if (r.part_of_day) return ORDEN_FRANJA[r.part_of_day];
  return "99";
}

// "Entre 10:00 y 13:00", "Desde las 10:00", "Por la mañana" o "Cuando puedas".
// Con hora en cada vez: "A las 9:15 y 19:00".
export function textoFranja(
  r: Pick<Rutina, "window_start" | "window_end" | "part_of_day"> & {
    times_of_day?: Rutina["times_of_day"];
  },
): string {
  const horas = (r.times_of_day ?? []).filter((h): h is string => h !== null);
  if (horas.length > 0) return `A las ${juntarHoras(horas)}`;
  if (r.window_start && r.window_end)
    return `Entre ${r.window_start} y ${r.window_end}`;
  if (r.window_start) return `Desde las ${r.window_start}`;
  if (r.part_of_day) return `Por la ${r.part_of_day}`;
  return "Cuando puedas";
}

function juntarHoras(horas: string[]): string {
  if (horas.length === 1) return horas[0];
  return `${horas.slice(0, -1).join(", ")} y ${horas[horas.length - 1]}`;
}

// "1.ª vez", "2.ª vez"...
export function nombreVez(numero: number): string {
  return `${numero}.ª vez`;
}

// "3 veces · 15 min" o "1 vez".
export function textoVeces(
  r: Pick<Rutina, "times_per_day" | "duration_minutes">,
): string {
  const veces = r.times_per_day === 1 ? "1 vez" : `${r.times_per_day} veces`;
  return r.duration_minutes ? `${veces} · ${r.duration_minutes} min` : veces;
}

// ---- Formulario ----

// Vacío = null; si no, el texto se convierte en número (como en las tareas).
const minutosOpcionales = textoOpcional
  .transform((v) => (v === null ? null : Number(v)))
  .pipe(
    z
      .number({ error: "Los minutos tienen que ser un número." })
      .int("Los minutos tienen que ser un número entero.")
      .min(1, "Pon al menos 1 minuto, o déjalo vacío.")
      .max(1440, "Como mucho 1440 minutos (un día).")
      .nullable(),
  );

const esquemaRutina = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Ponle un nombre (por ejemplo, Paseo del perro).")
      .max(200, "Como mucho 200 caracteres."),
    notes: textoOpcional.pipe(
      z.string().max(2000, "Las notas admiten 2000 caracteres.").nullable(),
    ),
    cuando: z.enum(["todos", "algunos"], { error: "Elige qué días toca." }),
    dias: z.array(z.enum(CODIGOS)),
    times_per_day: z.coerce
      .number({ error: "Las veces al día tienen que ser un número." })
      .int("Las veces al día tienen que ser un número entero.")
      .min(1, "Al menos 1 vez al día.")
      .max(20, "Como mucho 20 veces al día."),
    duration_minutes: minutosOpcionales,
    window_start: horaOpcional,
    window_end: horaOpcional,
    horas: z.array(horaOpcional),
    part_of_day: textoOpcional.pipe(z.enum(FRANJAS).nullable()),
    focus: z.boolean(),
    focus_alarm_minutes: textoOpcional
      .transform((v) => (v === null ? null : Number(v)))
      .pipe(
        z
          .number({ error: "Elige cuántos minutos antes te aviso." })
          .int("Elige cuántos minutos antes te aviso.")
          .min(1, "Elige cuántos minutos antes te aviso.")
          .max(120, "Como mucho 2 horas antes.")
          .nullable(),
      ),
    url: enlaceOpcional,
  })
  .superRefine((d, ctx) => {
    const primera = d.times_per_day > 1 ? d.horas.find((h) => h) : null;
    if (
      d.focus &&
      d.focus_alarm_minutes !== null &&
      !d.window_start &&
      !primera
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Para avisarte antes de empezar, pon a qué hora empieza (en «Desde»).",
      });
    const errorHoras = revisarHoras(d.window_start, d.window_end);
    if (errorHoras) ctx.addIssue({ code: "custom", message: errorHoras });
    if (d.cuando === "algunos" && d.dias.length === 0)
      ctx.addIssue({ code: "custom", message: "Marca qué días toca." });
  });

export type DatosRutina = Omit<Rutina, "id" | "active" | "project_id">;

export function prepararRutina(datos: {
  title: unknown;
  notes: unknown;
  cuando: unknown;
  dias: unknown[];
  times_per_day: unknown;
  duration_minutes: unknown;
  window_start: unknown;
  window_end: unknown;
  // La hora de cada vez (solo cuenta con más de 1 vez al día).
  horas?: unknown[];
  part_of_day: unknown;
  focus?: unknown;
  focus_alarm_minutes?: unknown;
  url?: unknown;
}): Resultado<DatosRutina> {
  const r = esquemaRutina.safeParse({
    title: datos.title ?? "",
    notes: datos.notes ?? "",
    cuando: datos.cuando ?? "todos",
    dias: datos.dias,
    times_per_day: datos.times_per_day ?? "",
    duration_minutes: datos.duration_minutes ?? "",
    window_start: datos.window_start ?? "",
    window_end: datos.window_end ?? "",
    horas: datos.horas ?? [],
    part_of_day: datos.part_of_day ?? "",
    // La casilla del formulario manda "si" cuando está marcada.
    focus: datos.focus === "si",
    focus_alarm_minutes: datos.focus_alarm_minutes ?? "",
    url: datos.url ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const d = r.data;
  // Varias veces al día: una hora por vez (las vacías se quedan vacías).
  // La franja pasa a ser la hora de la primera vez: así el orden en Hoy y el
  // aviso del modo foco siguen funcionando.
  const horas =
    d.times_per_day > 1
      ? Array.from({ length: d.times_per_day }, (_, i) => d.horas[i] ?? null)
      : [];
  const times_of_day = horas.some((h) => h !== null) ? horas : null;
  const window_start = times_of_day
    ? times_of_day.find((h) => h !== null)!
    : d.window_start;
  const window_end = times_of_day ? null : d.window_end;
  return {
    ok: true,
    valor: {
      title: d.title,
      notes: d.notes,
      repeat_rule:
        d.cuando === "todos"
          ? null
          : crearRegla({
              tipo: "semanal",
              dias: CODIGOS.filter((c) => d.dias.includes(c)),
              hasta: null,
            }),
      times_per_day: d.times_per_day,
      duration_minutes: d.duration_minutes,
      window_start,
      window_end,
      times_of_day,
      // Con hora de inicio de la franja, la parte del día sobra.
      part_of_day: window_start ? null : d.part_of_day,
      focus: d.focus,
      // Sin foco no hay aviso antes de empezar.
      focus_alarm_minutes: d.focus ? d.focus_alarm_minutes : null,
      url: d.url,
    },
  };
}

// ---- Volver ----

const RUTA_PROYECTO = /^\/areas\/[0-9a-f-]{36}\/proyectos\/[0-9a-f-]{36}$/i;

// A dónde vuelves al guardar o borrar una rutina, según de dónde entraste:
// "hoy", "agenda" o la página de un proyecto. Si no, a Ajustes.
// Solo se aceptan esas direcciones (nunca una página de fuera de la app).
export function destinoRutina(volver: unknown): string {
  if (volver === "hoy") return "/";
  if (volver === "agenda") return "/agenda";
  if (typeof volver === "string" && RUTA_PROYECTO.test(volver)) return volver;
  return "/ajustes";
}
