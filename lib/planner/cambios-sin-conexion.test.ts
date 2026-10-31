import { describe, expect, it } from "vitest";
import {
  anadirCambio,
  cambiadoDespues,
  diaDelApunte,
  leerCambios,
  type Cambio,
} from "./cambios-sin-conexion";

const base = { creado: "2026-10-31T09:00:00.000Z", vista: "2026-10-31T08:00:00.000Z" };
const nota = (id: string, notaId: string, texto: string): Cambio => ({
  ...base,
  id,
  tipo: "editar-nota",
  notaId,
  texto,
});

describe("leerCambios", () => {
  it("lee una lista guardada y descarta lo que está roto", () => {
    const lista = [nota("1", "n1", "hola")];
    expect(leerCambios(JSON.stringify(lista))).toEqual(lista);
    expect(leerCambios("{roto")).toEqual([]);
    expect(leerCambios(JSON.stringify([{ tipo: "otra-cosa" }]))).toEqual([]);
    expect(leerCambios(null)).toEqual([]);
  });
});

describe("anadirCambio", () => {
  it("si editas la misma nota dos veces, se queda solo la última", () => {
    const lista = anadirCambio([nota("1", "n1", "a"), nota("2", "n2", "b")], nota("3", "n1", "c"));
    expect(lista.map((c) => c.id)).toEqual(["2", "3"]);
  });

  it("los apuntes de hábitos se suman, no se sustituyen", () => {
    const apunte: Cambio = {
      ...base,
      id: "a",
      tipo: "apunte-habito",
      habitoId: "h1",
      dia: "2026-10-31",
      cantidad: "",
      nota: "",
    };
    expect(anadirCambio([apunte], { ...apunte, id: "b" })).toHaveLength(2);
  });
});

describe("cambiadoDespues", () => {
  it("avisa si se cambió después de perder la red", () => {
    expect(cambiadoDespues("2026-10-31T08:30:00Z", "2026-10-31T08:00:00Z")).toBe(true);
    expect(cambiadoDespues("2026-10-31T07:59:00Z", "2026-10-31T08:00:00Z")).toBe(false);
  });

  it("con fechas rotas no bloquea el cambio", () => {
    expect(cambiadoDespues("x", "2026-10-31T08:00:00Z")).toBe(false);
  });
});

describe("diaDelApunte", () => {
  const hoy = { dia: "2026-10-30", calendario: "2026-10-31" };

  it("el mismo día del reloj usa tu día de hoy (aún no te has ido a dormir)", () => {
    expect(diaDelApunte("2026-10-31", hoy)).toBe("2026-10-30");
  });

  it("si se envía otro día, usa la fecha del móvil", () => {
    expect(diaDelApunte("2026-10-29", hoy)).toBe("2026-10-29");
  });

  it("nunca en el futuro ni de hace más de 3 días", () => {
    expect(diaDelApunte("2026-11-01", hoy)).toBeNull();
    expect(diaDelApunte("2026-10-27", hoy)).toBeNull();
    expect(diaDelApunte("2026-10-28", hoy)).toBe("2026-10-28");
  });
});
