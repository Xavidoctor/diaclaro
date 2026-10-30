import { describe, expect, it } from "vitest";
import { leerHoraDormir, nocheDe, textoAcostaste } from "./dormir";

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
