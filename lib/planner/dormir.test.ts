import { describe, expect, it } from "vitest";
import {
  leerHoraDormir,
  leerMotivoTarde,
  minutosTarde,
  nocheDe,
  preguntarMotivo,
  textoAcostaste,
} from "./dormir";

describe("nocheDe", () => {
  it("por la noche, es la noche de hoy", () => {
    expect(nocheDe("2026-10-30", "2026-10-29", "23:40")).toBe("2026-10-30");
  });
  it("pasada la medianoche, sigue siendo la de ayer", () => {
    expect(nocheDe("2026-10-31", "2026-10-30", "01:10")).toBe("2026-10-30");
  });
  it("a partir de las 12:00 ya es la noche de hoy", () => {
    expect(nocheDe("2026-10-30", "2026-10-29", "12:00")).toBe("2026-10-30");
  });
});

describe("leerHoraDormir", () => {
  it("acepta una hora válida", () => {
    expect(leerHoraDormir("23:15")).toEqual({ ok: true, valor: "23:15" });
  });
  it("no acepta una hora vacía ni rara", () => {
    expect(leerHoraDormir("").ok).toBe(false);
    expect(leerHoraDormir(null).ok).toBe(false);
    expect(leerHoraDormir("25:00").ok).toBe(false);
  });
});

describe("textoAcostaste", () => {
  it("usa «a la» para la una", () => {
    expect(textoAcostaste("01:10")).toBe("Te acostaste a la 01:10");
    expect(textoAcostaste("23:40")).toBe("Te acostaste a las 23:40");
  });
});

describe("minutosTarde", () => {
  it("cuenta pasada la medianoche", () => {
    expect(minutosTarde("23:00", "01:30")).toBe(150);
    expect(minutosTarde("00:30", "01:00")).toBe(30);
  });
  it("es 0 si te acostaste a tu hora o antes", () => {
    expect(minutosTarde("23:00", "23:00")).toBe(0);
    expect(minutosTarde("00:30", "23:50")).toBe(0);
  });
});

describe("preguntarMotivo", () => {
  it("pregunta si es más tarde de lo previsto", () => {
    expect(
      preguntarMotivo({ nueva: "01:00", prevista: "23:00", guardada: null }),
    ).toBe(true);
    expect(
      preguntarMotivo({ nueva: "22:45", prevista: "23:00", guardada: "22:00" }),
    ).toBe(false);
  });
  it("sin hora prevista, compara con la guardada", () => {
    expect(
      preguntarMotivo({ nueva: "01:00", prevista: null, guardada: "00:00" }),
    ).toBe(true);
    expect(
      preguntarMotivo({ nueva: "23:00", prevista: null, guardada: "00:00" }),
    ).toBe(false);
  });
  it("sin ninguna referencia, siempre (es opcional); sin hora, nunca", () => {
    expect(
      preguntarMotivo({ nueva: "23:00", prevista: null, guardada: null }),
    ).toBe(true);
    expect(preguntarMotivo({ nueva: "", prevista: null, guardada: null })).toBe(
      false,
    );
  });
});

describe("leerMotivoTarde", () => {
  it("acepta un motivo de la lista y recorta la nota", () => {
    expect(leerMotivoTarde("trabajo", "  la tienda  ")).toEqual({
      late_reason: "trabajo",
      late_note: "la tienda",
    });
  });
  it("lo que no está en la lista o va vacío queda vacío", () => {
    expect(leerMotivoTarde("raro", "   ")).toEqual({
      late_reason: null,
      late_note: null,
    });
    expect(leerMotivoTarde(null, "x".repeat(300)).late_note).toHaveLength(200);
  });
});
