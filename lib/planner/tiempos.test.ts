import { describe, expect, it } from "vitest";
import {
  calcularFactor,
  factoresPorTipo,
  leerMinutosReales,
  minutosCorregidos,
  opcionesMinutosReales,
  textoFactor,
  type TareaHecha,
} from "./tiempos";

// Datos de ejemplo para las pruebas (no son los tiempos reales de nadie).
function hecha(
  previsto: number | null,
  real: number | null,
  dia = 1,
  kind: TareaHecha["kind"] = "tarea",
): TareaHecha {
  return {
    kind,
    estimated_minutes: previsto,
    actual_minutes: real,
    done_at: `2026-10-${String(dia).padStart(2, "0")}T12:00:00Z`,
  };
}

describe("calcularFactor", () => {
  it("con menos de 5 tareas no corrige nada", () => {
    expect(calcularFactor([hecha(60, 90), hecha(60, 90)])).toBeNull();
  });

  it("ignora las que no tienen minutos previstos o reales, o no están hechas", () => {
    const tareas = [
      hecha(60, 90),
      hecha(60, 90),
      hecha(60, 90),
      hecha(60, 90),
      hecha(null, 90),
      hecha(60, null),
      { ...hecha(60, 90), done_at: null },
    ];
    expect(calcularFactor(tareas)).toBeNull();
  });

  it("calcula real ÷ previsto con todas juntas", () => {
    // Previsto 300, real 420 → 1,4
    const tareas = [
      hecha(60, 60),
      hecha(60, 90),
      hecha(60, 90),
      hecha(60, 90),
      hecha(60, 90),
    ];
    expect(calcularFactor(tareas)).toEqual({ factor: 1.4, muestras: 5 });
  });

  it("solo usa las 30 más recientes", () => {
    const antiguas = Array.from({ length: 30 }, () => hecha(60, 600, 1));
    const recientes = Array.from({ length: 30 }, () => hecha(60, 60, 20));
    expect(calcularFactor([...antiguas, ...recientes])).toEqual({
      factor: 1,
      muestras: 30,
    });
  });
});

describe("factoresPorTipo", () => {
  it("separa tareas y entregas, y omite el tipo sin bastantes datos", () => {
    const tareas = [
      ...Array.from({ length: 5 }, () => hecha(30, 60, 1, "entrega")),
      hecha(30, 30),
    ];
    expect(factoresPorTipo(tareas)).toEqual({
      entrega: { factor: 2, muestras: 5 },
    });
  });
});

describe("minutosCorregidos", () => {
  it("sin factor deja los minutos como están", () => {
    expect(minutosCorregidos(60, undefined)).toBe(60);
  });

  it("aplica el factor y redondea a 5 minutos", () => {
    expect(minutosCorregidos(60, { factor: 1.4, muestras: 5 })).toBe(85);
    expect(minutosCorregidos(5, { factor: 0.5, muestras: 5 })).toBe(5);
  });
});

describe("textoFactor", () => {
  it("escribe el número a la española", () => {
    expect(textoFactor({ factor: 1.4, muestras: 5 })).toBe(
      "1,4 veces lo que prevés",
    );
    expect(textoFactor({ factor: 1, muestras: 5 })).toBe("lo que prevés");
  });
});

describe("opcionesMinutosReales", () => {
  it("pone primero los minutos previstos", () => {
    expect(opcionesMinutosReales(45)).toEqual([45, 15, 30, 60, 90, 120]);
    expect(opcionesMinutosReales(20)).toEqual([20, 15, 30, 45, 60, 90]);
    expect(opcionesMinutosReales(null)).toEqual([15, 30, 45, 60, 90, 120]);
  });
});

describe("leerMinutosReales", () => {
  it("acepta minutos enteros entre 1 y 1440", () => {
    expect(leerMinutosReales("40")).toBe(40);
    expect(leerMinutosReales("")).toBeNull();
    expect(leerMinutosReales("0")).toBeNull();
    expect(leerMinutosReales("2000")).toBeNull();
    expect(leerMinutosReales("1.5")).toBeNull();
    expect(leerMinutosReales(null)).toBeNull();
  });
});
