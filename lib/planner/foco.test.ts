import { describe, expect, it } from "vitest";
import {
  iniciar,
  leerGuardado,
  minutosHechos,
  minutosPorTarea,
  pausar,
  prepararObjetivo,
  prepararSesion,
  reanudar,
  restante,
  terminado,
  textoReloj,
  totalMinutos,
  transcurrido,
} from "./foco";

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 30, 9, 0); // 30 oct 2026, 10:00 en Madrid
const tarea = { id: "0b8f6f0e-3c1a-4b8e-9c1d-2a3b4c5d6e7f", title: "Repasar" };

describe("temporizador", () => {
  it("cuenta el tiempo desde que empieza", () => {
    const t = iniciar(25, tarea, T0);
    expect(transcurrido(t, T0 + 10 * MIN)).toBe(10 * MIN);
    expect(restante(t, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(terminado(t, T0 + 10 * MIN)).toBe(false);
    expect(t.tareaTitulo).toBe("Repasar");
  });

  it("las pausas no cuentan", () => {
    let t = iniciar(25, null, T0);
    t = pausar(t, T0 + 5 * MIN);
    // En pausa el reloj se queda quieto.
    expect(transcurrido(t, T0 + 20 * MIN)).toBe(5 * MIN);
    t = reanudar(t, T0 + 20 * MIN);
    expect(transcurrido(t, T0 + 30 * MIN)).toBe(15 * MIN);
    expect(t.pausaAcumulada).toBe(15 * MIN);
  });

  it("pausar dos veces o reanudar sin pausa no hace nada", () => {
    const t = iniciar(25, null, T0);
    const p = pausar(t, T0 + MIN);
    expect(pausar(p, T0 + 2 * MIN)).toBe(p);
    expect(reanudar(t, T0 + MIN)).toBe(t);
  });

  it("termina al llegar al objetivo y no cuenta de más", () => {
    const t = iniciar(25, null, T0);
    expect(terminado(t, T0 + 25 * MIN)).toBe(true);
    expect(restante(t, T0 + 90 * MIN)).toBe(0);
    // Volviste una hora tarde: se guardan 25, no 90.
    expect(minutosHechos(t, T0 + 90 * MIN)).toBe(25);
    expect(minutosHechos(t, T0 + 12 * MIN + 40_000)).toBe(13);
  });

  it("escribe el reloj", () => {
    expect(textoReloj(25 * MIN)).toBe("25:00");
    expect(textoReloj(59_000)).toBe("00:59");
    expect(textoReloj(500)).toBe("00:01");
    expect(textoReloj(0)).toBe("00:00");
    expect(textoReloj(62 * MIN + 3000)).toBe("1:02:03");
  });
});

describe("leerGuardado", () => {
  it("recupera un temporizador guardado", () => {
    const t = pausar(iniciar(50, tarea, T0), T0 + MIN);
    expect(leerGuardado(JSON.stringify(t))).toEqual(t);
  });

  it("ignora lo que no tiene buena forma", () => {
    expect(leerGuardado(null)).toBeNull();
    expect(leerGuardado("no es json")).toBeNull();
    expect(leerGuardado(JSON.stringify({ inicio: "ayer" }))).toBeNull();
    const malo = { ...iniciar(25, null, T0), objetivoMinutos: 9999 };
    expect(leerGuardado(JSON.stringify(malo))).toBeNull();
  });
});

describe("prepararObjetivo", () => {
  it("acepta minutos enteros", () => {
    expect(prepararObjetivo(" 45 ")).toEqual({ ok: true, valor: 45 });
  });

  it("rechaza vacío, decimales y fuera de rango", () => {
    expect(prepararObjetivo("").ok).toBe(false);
    expect(prepararObjetivo("2,5").ok).toBe(false);
    expect(prepararObjetivo("0").ok).toBe(false);
    expect(prepararObjetivo("601").ok).toBe(false);
    expect(prepararObjetivo(undefined).ok).toBe(false);
  });
});

describe("prepararSesion", () => {
  const ahora = new Date(T0 + 30 * MIN);
  const base = {
    tarea: tarea.id,
    inicio: new Date(T0).toISOString(),
    objetivo: "25",
    minutos: "25",
  };

  it("prepara la sesión para guardarla", () => {
    expect(prepararSesion(base, ahora)).toEqual({
      ok: true,
      valor: {
        task_id: tarea.id,
        started_at: "2026-10-30T09:00:00.000Z",
        ended_at: "2026-10-30T09:25:00.000Z",
        planned_minutes: 25,
        minutes: 25,
      },
    });
  });

  it("la tarea y el objetivo son opcionales", () => {
    const r = prepararSesion({ ...base, tarea: "", objetivo: "" }, ahora);
    expect(r.ok && r.valor.task_id).toBeNull();
    expect(r.ok && r.valor.planned_minutes).toBeNull();
  });

  it("pide al menos 1 minuto", () => {
    expect(prepararSesion({ ...base, minutos: "0" }, ahora)).toEqual({
      ok: false,
      error: "Para guardar tiene que ser al menos 1 minuto.",
    });
    expect(prepararSesion({ ...base, minutos: "" }, ahora).ok).toBe(false);
  });

  it("rechaza datos raros", () => {
    expect(prepararSesion({ ...base, tarea: "123" }, ahora).ok).toBe(false);
    expect(prepararSesion({ ...base, inicio: "ayer" }, ahora).ok).toBe(false);
    const futuro = new Date(T0 + 60 * MIN).toISOString();
    expect(prepararSesion({ ...base, inicio: futuro }, ahora).ok).toBe(false);
    const viejo = new Date(T0 - 3 * 24 * 60 * MIN).toISOString();
    expect(prepararSesion({ ...base, inicio: viejo }, ahora).ok).toBe(false);
  });
});

describe("sumas", () => {
  const sesiones = [
    { task_id: "a", minutes: 25 },
    { task_id: null, minutes: 10 },
    { task_id: "a", minutes: 20 },
    { task_id: "b", minutes: 5 },
  ];

  it("suma los minutos de cada tarea", () => {
    expect(minutosPorTarea(sesiones)).toEqual({ a: 45, b: 5 });
  });

  it("suma el total", () => {
    expect(totalMinutos(sesiones)).toBe(60);
    expect(totalMinutos([])).toBe(0);
  });
});
