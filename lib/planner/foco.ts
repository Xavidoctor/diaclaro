import { z } from "zod";
import type { Resultado } from "./bandeja";

// Reglas del temporizador de foco. Funciones puras, con pruebas en foco.test.ts.
//
// El temporizador no cuenta "tic, tic": guarda cuándo empezaste y cuánto
// tiempo llevas en pausa. Así el tiempo es correcto aunque cierres la app,
// bloquees el móvil o recargues la página. Todas las horas van en
// milisegundos desde 1970 (lo que devuelve Date.now()).

export const MAX_OBJETIVO = 600; // 10 horas como mucho
const MINUTO = 60_000;

export type Temporizador = {
  inicio: number;
  objetivoMinutos: number;
  pausadoDesde: number | null; // null = está en marcha
  pausaAcumulada: number; // milisegundos que ha estado en pausa
  tareaId: string | null;
  tareaTitulo: string | null;
};

export function iniciar(
  objetivoMinutos: number,
  tarea: { id: string; title: string } | null,
  ahora: number,
): Temporizador {
  return {
    inicio: ahora,
    objetivoMinutos,
    pausadoDesde: null,
    pausaAcumulada: 0,
    tareaId: tarea?.id ?? null,
    tareaTitulo: tarea?.title ?? null,
  };
}

export function pausar(t: Temporizador, ahora: number): Temporizador {
  if (t.pausadoDesde !== null) return t;
  return { ...t, pausadoDesde: ahora };
}

export function reanudar(t: Temporizador, ahora: number): Temporizador {
  if (t.pausadoDesde === null) return t;
  return {
    ...t,
    pausadoDesde: null,
    pausaAcumulada: t.pausaAcumulada + Math.max(0, ahora - t.pausadoDesde),
  };
}

// Tiempo trabajado de verdad (sin contar las pausas), en milisegundos.
export function transcurrido(t: Temporizador, ahora: number): number {
  const hasta = t.pausadoDesde ?? ahora;
  return Math.max(0, hasta - t.inicio - t.pausaAcumulada);
}

// Lo que falta para llegar al objetivo (nunca menos de 0).
export function restante(t: Temporizador, ahora: number): number {
  return Math.max(0, t.objetivoMinutos * MINUTO - transcurrido(t, ahora));
}

export function terminado(t: Temporizador, ahora: number): boolean {
  return restante(t, ahora) === 0;
}

// Minutos para guardar. Si se te pasó el aviso y volviste tarde, no cuenta
// más del objetivo: siempre puedes cambiar el número antes de guardar.
export function minutosHechos(t: Temporizador, ahora: number): number {
  const ms = Math.min(transcurrido(t, ahora), t.objetivoMinutos * MINUTO);
  return Math.round(ms / MINUTO);
}

// 1500000 → "25:00", 59000 → "00:59", 3723000 → "1:02:03".
export function textoReloj(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

// ---- Guardado en el móvil ----
// El temporizador en marcha se guarda en el navegador para no perderlo si
// recargas. Al leerlo comprobamos que tiene buena forma (alguien lo pudo tocar).

const esquemaGuardado = z.object({
  inicio: z.number().finite().positive(),
  objetivoMinutos: z.number().int().min(1).max(MAX_OBJETIVO),
  pausadoDesde: z.number().finite().positive().nullable(),
  pausaAcumulada: z.number().finite().min(0),
  tareaId: z.string().nullable(),
  tareaTitulo: z.string().nullable(),
});

export function leerGuardado(texto: string | null): Temporizador | null {
  if (!texto) return null;
  try {
    const r = esquemaGuardado.safeParse(JSON.parse(texto));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

// ---- Formularios ----

// "25" → 25. Vacío, decimales o fuera de rango → error.
export function prepararObjetivo(valor: unknown): Resultado<number> {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (texto === "") return { ok: false, error: "Escribe cuántos minutos." };
  if (!/^\d+$/.test(texto))
    return { ok: false, error: "Escribe un número entero de minutos." };
  const n = Number(texto);
  if (n < 1 || n > MAX_OBJETIVO)
    return { ok: false, error: `Entre 1 y ${MAX_OBJETIVO} minutos.` };
  return { ok: true, valor: n };
}

export type DatosSesion = {
  task_id: string | null;
  started_at: string;
  ended_at: string;
  planned_minutes: number | null;
  minutes: number;
};

const esquemaSesion = z.object({
  tarea: z.uuid().nullable(),
  inicio: z.iso.datetime(),
  objetivo: z.coerce.number().int().min(1).max(MAX_OBJETIVO).nullable(),
  minutos: z.coerce
    .number({ error: "Escribe cuántos minutos has hecho." })
    .int("Escribe un número entero de minutos.")
    .min(1, "Para guardar tiene que ser al menos 1 minuto.")
    .max(1440, "Como mucho 1440 minutos (un día)."),
});

// Comprueba lo que manda el temporizador al guardar una sesión.
// "ahora" llega desde fuera para poder probarlo.
export function prepararSesion(
  formulario: {
    tarea: unknown;
    inicio: unknown;
    objetivo: unknown;
    minutos: unknown;
  },
  ahora: Date,
): Resultado<DatosSesion> {
  const vacioANull = (v: unknown) => (v === "" || v == null ? null : v);
  const r = esquemaSesion.safeParse({
    tarea: vacioANull(formulario.tarea),
    inicio: formulario.inicio,
    objetivo: vacioANull(formulario.objetivo),
    minutos: formulario.minutos === "" ? undefined : formulario.minutos,
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };

  const inicio = new Date(r.data.inicio);
  // Un margen de 5 minutos por si el reloj del móvil va un poco adelantado.
  if (inicio.getTime() > ahora.getTime() + 5 * MINUTO)
    return { ok: false, error: "La hora de inicio está en el futuro." };
  if (ahora.getTime() - inicio.getTime() > 2 * 24 * 60 * MINUTO)
    return {
      ok: false,
      error: "Esta sesión empezó hace más de dos días. Descártala.",
    };

  // Hora de fin aproximada: el inicio más los minutos hechos.
  const fin = new Date(inicio.getTime() + r.data.minutos * MINUTO);
  return {
    ok: true,
    valor: {
      task_id: r.data.tarea,
      started_at: inicio.toISOString(),
      ended_at: fin.toISOString(),
      planned_minutes: r.data.objetivo,
      minutes: r.data.minutos,
    },
  };
}

// Suma los minutos de foco de cada tarea: { "id-tarea": 50, ... }.
export function minutosPorTarea(
  sesiones: { task_id: string | null; minutes: number }[],
): Record<string, number> {
  const suma: Record<string, number> = {};
  for (const s of sesiones) {
    if (s.task_id) suma[s.task_id] = (suma[s.task_id] ?? 0) + s.minutes;
  }
  return suma;
}

export function totalMinutos(sesiones: { minutes: number }[]): number {
  return sesiones.reduce((total, s) => total + s.minutes, 0);
}
