import { describe, expect, it } from "vitest";
import {
  barraHoras,
  minutosLibresSemana,
  prepararHorasSueno,
} from "./horas-libres";

describe("minutosLibresSemana", () => {
  it("con 9 h de sueño quedan 105 h a la semana", () => {
    expect(minutosLibresSemana({ sueno: 9 })).toBe(105 * 60);
  });
  it("acepta medias horas y nunca baja de 0", () => {
    expect(minutosLibresSemana({ sueno: 8.5 })).toBe(15.5 * 60 * 7);
    expect(minutosLibresSemana({ sueno: 30 })).toBe(0);
  });
});

describe("barraHoras", () => {
  it("dice cuánto has repartido y cuánto queda", () => {
    expect(barraHoras(105 * 60, 36 * 60)).toEqual({
      libres: 105 * 60,
      repartidas: 36 * 60,
      porcentaje: 34,
      quedan: 69 * 60,
      teHasPasado: 0,
      casiLleno: false,
    });
  });
  it("avisa con suavidad a partir del 80 %", () => {
    expect(barraHoras(105 * 60, 84 * 60).casiLleno).toBe(true);
    expect(barraHoras(105 * 60, 83 * 60).casiLleno).toBe(false);
  });
  it("avisa si te pasas y la barra no pasa del 100 %", () => {
    expect(barraHoras(600, 660)).toMatchObject({
      porcentaje: 100,
      quedan: 0,
      teHasPasado: 60,
      casiLleno: false,
    });
  });
});

describe("prepararHorasSueno", () => {
  it("vacío usa 9 h; acepta coma", () => {
    expect(prepararHorasSueno({ sueno: "" })).toEqual({
      ok: true,
      valor: { sueno: 9 },
    });
    expect(prepararHorasSueno({ sueno: "8,5" })).toEqual({
      ok: true,
      valor: { sueno: 8.5 },
    });
  });
  it("rechaza texto y más de 24 h", () => {
    expect(prepararHorasSueno({ sueno: "mucho" }).ok).toBe(false);
    expect(prepararHorasSueno({ sueno: "25" }).ok).toBe(false);
  });
});
