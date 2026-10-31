import { describe, expect, it } from "vitest";
import {
  COLORES_AREA,
  VERDE_OSCURO,
  colorDeProyecto,
  hexDeColor,
  leerColor,
} from "./colores";

describe("colores de las áreas", () => {
  it("pocos colores", () => {
    expect(COLORES_AREA.length).toBeLessThanOrEqual(6);
  });

  it("solo acepta colores de la lista", () => {
    expect(leerColor("azul")).toBe("azul");
    expect(leerColor("fucsia")).toBeNull();
    expect(leerColor("")).toBeNull();
  });

  it("sin color, verde oscuro", () => {
    expect(hexDeColor(null)).toBe(VERDE_OSCURO);
    expect(hexDeColor("rosa")).toBe("#e07bb0");
  });

  it("el color de una tarea es el de su área", () => {
    const proyectos = [{ id: "p1", area_id: "a1" }];
    const areas = [{ id: "a1", color: "azul" }];
    expect(colorDeProyecto("p1", proyectos, areas)).toBe("#5b8def");
    expect(colorDeProyecto(null, proyectos, areas)).toBe(VERDE_OSCURO);
  });
});
