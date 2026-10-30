import { describe, expect, it } from "vitest";
import {
  esMes,
  juntarRangos,
  leerMesParam,
  mesDe,
  mesInicial,
  nombreMes,
  semanasDelMes,
  sumarMeses,
} from "./calendario";

describe("meses", () => {
  it("saca el mes de un día", () => {
    expect(mesDe("2026-11-04")).toBe("2026-11");
  });

  it("reconoce meses válidos", () => {
    expect(esMes("2026-11")).toBe(true);
    expect(esMes("2026-13")).toBe(false);
    expect(esMes("2026-1")).toBe(false);
    expect(esMes("hola")).toBe(false);
  });

  it("usa el mes por defecto si el de la dirección no vale", () => {
    expect(leerMesParam("2027-02", "2026-10")).toBe("2027-02");
    expect(leerMesParam("2027-2", "2026-10")).toBe("2026-10");
    expect(leerMesParam(undefined, "2026-10")).toBe("2026-10");
    expect(leerMesParam(["2027-02"], "2026-10")).toBe("2026-10");
  });

  it("suma y resta meses cambiando de año", () => {
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
  });

  it("escribe el nombre del mes en español", () => {
    expect(nombreMes("2026-11")).toBe("noviembre de 2026");
  });
});

describe("semanasDelMes", () => {
  it("empieza en lunes y rellena con días de los meses de al lado", () => {
    // El 1 de octubre de 2026 es jueves.
    const semanas = semanasDelMes("2026-10");
    expect(semanas[0]).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(semanas).toHaveLength(5);
    expect(semanas.at(-1)!.at(-1)).toBe("2026-11-01");
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });

  it("no añade una semana de más si el mes acaba en domingo", () => {
    // Noviembre de 2026: empieza en domingo y acaba en lunes → 6 semanas.
    const noviembre = semanasDelMes("2026-11");
    expect(noviembre[0][6]).toBe("2026-11-01");
    expect(noviembre).toHaveLength(6);
    // Febrero de 2027 empieza en lunes y acaba en domingo → 4 semanas justas.
    const febrero = semanasDelMes("2027-02");
    expect(febrero).toHaveLength(4);
    expect(febrero[0][0]).toBe("2027-02-01");
    expect(febrero[3][6]).toBe("2027-02-28");
  });
});

describe("juntarRangos", () => {
  it("junta los que se solapan o están cerca", () => {
    expect(
      juntarRangos([
        { desde: "2026-11-01", hasta: "2026-11-30" },
        { desde: "2026-10-30", hasta: "2026-11-01" },
        { desde: "2026-11-05", hasta: "2026-11-05" },
      ]),
    ).toEqual([{ desde: "2026-10-30", hasta: "2026-11-30" }]);
  });

  it("deja separados los que están lejos", () => {
    expect(
      juntarRangos([
        { desde: "2027-03-01", hasta: "2027-04-05" },
        { desde: "2026-10-30", hasta: "2026-11-01" },
      ]),
    ).toEqual([
      { desde: "2026-10-30", hasta: "2026-11-01" },
      { desde: "2027-03-01", hasta: "2027-04-05" },
    ]);
  });
});

describe("mesInicial", () => {
  it("enseña el mes de hoy si no estás en la última semana", () => {
    expect(mesInicial("2026-10-24")).toBe("2026-10");
    expect(mesInicial("2026-02-01")).toBe("2026-02");
  });

  it("salta al mes siguiente en los últimos 7 días del mes", () => {
    expect(mesInicial("2026-10-25")).toBe("2026-11");
    expect(mesInicial("2026-10-31")).toBe("2026-11");
    expect(mesInicial("2026-12-28")).toBe("2027-01");
    expect(mesInicial("2026-02-22")).toBe("2026-03");
  });
});
