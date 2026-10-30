import { describe, expect, it } from "vitest";
import { diaACerrar, hechasEnDia, horaLocal, prepararCierre } from "./cierre";

describe("prepararCierre", () => {
  it("guarda las dos respuestas sin espacios sobrantes", () => {
    expect(
      prepararCierre({ achieved: " Entregué la PEC ", change_tomorrow: "" }),
    ).toEqual({
      ok: true,
      valor: { achieved: "Entregué la PEC", change_tomorrow: null },
    });
  });

  it("pide al menos una respuesta", () => {
    expect(prepararCierre({ achieved: "  ", change_tomorrow: "" })).toEqual({
      ok: false,
      error: "Escribe al menos una de las dos respuestas.",
    });
    expect(prepararCierre({ achieved: null, change_tomorrow: null }).ok).toBe(
      false,
    );
  });

  it("no deja textos larguísimos", () => {
    const largo = "a".repeat(3001);
    expect(prepararCierre({ achieved: largo, change_tomorrow: "" }).ok).toBe(
      false,
    );
  });
});

describe("hechasEnDia", () => {
  const tareas = [
    { id: "1", done_at: "2026-10-30T09:00:00Z" }, // 10:00 en Madrid, día 30
    { id: "2", done_at: "2026-10-30T23:30:00Z" }, // 00:30 en Madrid, ya día 31
    { id: "3", done_at: null },
    { id: "4", done_at: "2026-10-29T22:59:00Z" }, // 23:59 en Madrid, día 29
  ];

  it("cuenta el día en tu zona horaria", () => {
    expect(
      hechasEnDia(tareas, "2026-10-30", "Europe/Madrid").map((t) => t.id),
    ).toEqual(["1"]);
    expect(
      hechasEnDia(tareas, "2026-10-31", "Europe/Madrid").map((t) => t.id),
    ).toEqual(["2"]);
    expect(
      hechasEnDia(tareas, "2026-10-29", "Europe/Madrid").map((t) => t.id),
    ).toEqual(["4"]);
  });
});

describe("diaACerrar", () => {
  it("de madrugada cierra el día anterior", () => {
    expect(diaACerrar("2026-10-31", "2026-10-30", 1)).toBe("2026-10-30");
    expect(diaACerrar("2026-10-31", "2026-10-30", 5)).toBe("2026-10-31");
    expect(diaACerrar("2026-10-31", "2026-10-30", 23)).toBe("2026-10-31");
  });
});

describe("horaLocal", () => {
  it("da la hora en la zona indicada", () => {
    const momento = new Date("2026-10-30T23:30:00Z");
    expect(horaLocal("Europe/Madrid", momento)).toBe(0);
    expect(horaLocal("UTC", momento)).toBe(23);
  });
});
