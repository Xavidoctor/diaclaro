import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import {
  colocar,
  conRutinasHechas,
  cuentaHechas,
  encajar,
  estaPasando,
  horaDeTerminar,
  marcarGrabadas,
  rangoDelDia,
  siguienteParaAdelantar,
} from "./dia-por-horas";
import { sePuedeMover } from "./mover-dia";

// Datos de ejemplo (no son los horarios reales de nadie).
function o(
  titulo: string,
  horaInicio: string | null,
  horaFin: string | null,
  bloque?: Ocurrencia["bloque"],
): Ocurrencia {
  return {
    eventoId: titulo,
    titulo,
    fecha: "2026-11-02",
    fechaOriginal: "2026-11-02",
    horaInicio,
    horaFin,
    franja: null,
    seRepite: false,
    cambiada: false,
    bloque,
  };
}
const rutina = (extra: Partial<NonNullable<Ocurrencia["bloque"]>> = {}) => ({
  tipo: "rutina" as const,
  id: "r",
  hecha: false,
  vez: 1,
  fija: true,
  ...extra,
});

describe("las horas que se ven", () => {
  it("de la hora en punto antes a la hora en punto después", () => {
    expect(
      rangoDelDia([o("A", "09:15", "10:00"), o("B", "17:50", "18:50")]),
    ).toEqual({ desde: 9 * 60, hasta: 19 * 60 });
  });

  it("sin nada con hora, de 8 a 20", () => {
    expect(rangoDelDia([o("A", null, null)])).toEqual({
      desde: 480,
      hasta: 1200,
    });
  });
});

describe("cuadros que se juntan", () => {
  it("van uno al lado del otro", () => {
    const c = colocar([
      o("Tutoría 1", "17:00", "18:00"),
      o("Tutoría 2", "17:50", "18:50"),
      o("Paseo", "19:00", "19:30"),
    ]);
    const de = (t: string) => c.find((x) => x.o.titulo === t)!;
    expect([de("Tutoría 1").columna, de("Tutoría 1").columnas]).toEqual([0, 2]);
    expect([de("Tutoría 2").columna, de("Tutoría 2").columnas]).toEqual([1, 2]);
    expect([de("Paseo").columna, de("Paseo").columnas]).toEqual([0, 1]);
  });
});

describe("encajar justo después de lo anterior", () => {
  const otros = [{ inicio: 17 * 60, fin: 18 * 60 }];

  it("si lo sueltas cerca del final de otra cosa, empieza cuando acaba", () => {
    expect(encajar(18 * 60 + 8, 45, otros)).toBe(18 * 60);
    expect(encajar(17 * 60 + 55, 45, otros)).toBe(18 * 60);
  });

  it("si su final queda cerca del principio de otra cosa, acaba justo antes", () => {
    expect(encajar(16 * 60 + 20, 45, otros)).toBe(16 * 60 + 15);
  });

  it("lejos de todo, va de 15 en 15 minutos", () => {
    expect(encajar(14 * 60 + 7, 45, otros)).toBe(14 * 60);
  });
});

describe("clases grabadas", () => {
  it("la grabada que se junta con una que no lo está, para otro momento", () => {
    const r = marcarGrabadas([
      o("Clase en directo", "17:00", "18:00", rutina()),
      o("Clase grabada", "17:30", "18:30", rutina({ grabada: true })),
    ]);
    expect(r[0].bloque?.aOtraHora).toBeUndefined();
    expect(r[1].bloque?.aOtraHora).toBe(true);
    expect(sePuedeMover(r[1])).toBe(true);
  });

  it("si no se junta con nada, va a su hora", () => {
    const r = marcarGrabadas([
      o("Clase grabada", "10:00", "11:00", rutina({ grabada: true })),
      o("Otra", "12:00", "13:00", rutina()),
    ]);
    expect(r[0].bloque?.aOtraHora).toBeUndefined();
  });

  it("dos grabadas a la vez: la primera a su hora, la otra para otro momento", () => {
    const r = marcarGrabadas([
      o("Grabada 1", "10:00", "11:00", rutina({ grabada: true })),
      o("Grabada 2", "10:30", "11:30", rutina({ grabada: true })),
    ]);
    expect(r.map((x) => Boolean(x.bloque?.aOtraHora))).toEqual([false, true]);
  });

  it("una grabada que ya moviste ese día se sigue pudiendo mover", () => {
    const movida = {
      ...o("Grabada", "20:00", "21:00", rutina({ grabada: true })),
      cambiada: true,
    };
    expect(marcarGrabadas([movida])[0].bloque?.aOtraHora).toBe(true);
  });
});

describe("terminar antes", () => {
  it("sabe si algo está pasando ahora", () => {
    expect(
      estaPasando({ horaInicio: "17:00", horaFin: "18:00" }, "17:40"),
    ).toBe(true);
    expect(
      estaPasando({ horaInicio: "17:00", horaFin: "18:00" }, "18:00"),
    ).toBe(false);
    expect(estaPasando({ horaInicio: "17:00", horaFin: null }, "17:10")).toBe(
      false,
    );
  });

  it("apunta la hora redondeada a 5 minutos", () => {
    expect(horaDeTerminar("17:00", "17:43")).toBe("17:40");
    expect(horaDeTerminar("17:00", "17:01")).toBe("17:05");
  });

  it("propone adelantar lo siguiente que se puede mover", () => {
    const paseo = o("Paseo", "19:00", "19:30", rutina({ fija: false }));
    const lista = [o("Clase", "17:00", "18:00", rutina()), paseo];
    expect(siguienteParaAdelantar(lista, "17:40", sePuedeMover)).toBe(paseo);
    expect(siguienteParaAdelantar(lista, "19:10", sePuedeMover)).toBeNull();
  });
});

describe("conRutinasHechas y cuentaHechas", () => {
  const paseo = (vez: number) =>
    o("Paseo", vez === 1 ? "09:00" : "19:00", null, {
      tipo: "rutina",
      id: "r1",
      hecha: false,
      vez,
    });
  const paseoDatos = {
    id: "r1",
    times_per_day: 2,
    times_of_day: ["09:00", "19:00"],
  };

  it("marca solo la vez apuntada", () => {
    const lista = conRutinasHechas(
      [paseo(1), paseo(2)],
      [paseoDatos],
      [{ routine_id: "r1", on_date: "2026-11-02", slot: 1 }],
      "2026-11-02",
    );
    expect(lista.map((x) => x.bloque?.hecha)).toEqual([true, false]);
    expect(cuentaHechas(lista)).toEqual({ hechas: 1, total: 2 });
  });

  it("lo apuntado otro día no cuenta", () => {
    const lista = conRutinasHechas(
      [paseo(1)],
      [paseoDatos],
      [{ routine_id: "r1", on_date: "2026-11-01", slot: 1 }],
      "2026-11-02",
    );
    expect(lista[0].bloque?.hecha).toBe(false);
  });

  it("los compromisos no cuentan como cosas por hacer", () => {
    expect(cuentaHechas([o("Clase", "10:00", "11:00")])).toEqual({
      hechas: 0,
      total: 0,
    });
  });
});
