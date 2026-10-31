import { describe, expect, it } from "vitest";
import {
  barraHoras,
  minutosLibresSemana,
  prepararHorasDescanso,
} from "./horas-libres";

describe("minutosLibresSemana", () => {
  it("con 9 h de sueño y 4 de descansos quedan 77 h a la semana", () => {
    expect(minutosLibresSemana({ sueno: 9, descanso: 4 })).toBe(77 * 60);
  });
  it("acepta medias horas y nunca baja de 0", () => {
    expect(minutosLibresSemana({ sueno: 8.5, descanso: 4 })).toBe(
      11.5 * 60 * 7,
    );
    expect(minutosLibresSemana({ sueno: 20, descanso: 10 })).toBe(0);
  });
});

describe("barraHoras", () => {
  it("dice cuánto has repartido y cuánto queda", () => {
    expect(barraHoras(77 * 60, 36 * 60)).toEqual({
      libres: 77 * 60,
      repartidas: 36 * 60,
      porcentaje: 47,
      quedan: 41 * 60,
      teHasPasado: 0,
    });
  });
  it("avisa si te pasas y la barra no pasa del 100 %", () => {
    expect(barraHoras(600, 660)).toMatchObject({
      porcentaje: 100,
      quedan: 0,
      teHasPasado: 60,
    });
  });
});

describe("prepararHorasDescanso", () => {
  it("vacío usa 9 y 4; acepta coma", () => {
    expect(prepararHorasDescanso({ sueno: "", descanso: "" })).toEqual({
      ok: true,
      valor: { sueno: 9, descanso: 4 },
    });
    expect(prepararHorasDescanso({ sueno: "8,5", descanso: "3" })).toEqual({
      ok: true,
      valor: { sueno: 8.5, descanso: 3 },
    });
  });
  it("rechaza texto y más de 24 h", () => {
    expect(prepararHorasDescanso({ sueno: "mucho", descanso: "" }).ok).toBe(
      false,
    );
    expect(prepararHorasDescanso({ sueno: "20", descanso: "5" }).ok).toBe(
      false,
    );
  });
});
