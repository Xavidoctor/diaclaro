import { describe, expect, it } from "vitest";
import {
  PREFERENCIAS_INICIALES,
  leerCasilla,
  seccionVisible,
  seccionesVisibles,
} from "./secciones";

describe("seccionVisible", () => {
  it("en automático, solo se ve si ya la usas", () => {
    expect(seccionVisible(null, false)).toBe(false);
    expect(seccionVisible(null, true)).toBe(true);
  });

  it("lo que eliges en Ajustes manda", () => {
    expect(seccionVisible(true, false)).toBe(true);
    expect(seccionVisible(false, true)).toBe(false);
  });
});

describe("seccionesVisibles", () => {
  it("a una persona nueva no le salen Empleo ni Documentos", () => {
    expect(
      seccionesVisibles(PREFERENCIAS_INICIALES, {
        candidaturas: false,
        drive: false,
      }),
    ).toEqual({ empleo: false, documentos: false });
  });

  it("a quien ya tiene candidaturas o Drive no le desaparecen", () => {
    expect(
      seccionesVisibles(PREFERENCIAS_INICIALES, {
        candidaturas: true,
        drive: true,
      }),
    ).toEqual({ empleo: true, documentos: true });
  });

  it("cada sección va por su lado", () => {
    expect(
      seccionesVisibles(
        { empleo: true, documentos: false },
        { candidaturas: false, drive: true },
      ),
    ).toEqual({ empleo: true, documentos: false });
  });
});

describe("leerCasilla", () => {
  it("marcada se ve; sin marcar, no", () => {
    expect(leerCasilla("on")).toBe(true);
    expect(leerCasilla(null)).toBe(false);
    expect(leerCasilla("otra cosa")).toBe(false);
  });
});
