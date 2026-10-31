import { describe, expect, it } from "vitest";
import { areasDelDia, textoDiaDe } from "./resumen-dias";

// Datos de ejemplo.
const areas = [
  { id: "a2", name: "Dropshipping", position: 2 },
  { id: "a1", name: "Estudio", position: 1 },
  { id: "a0", name: "Ejercicio", position: 0 },
];
const proyectos = [
  { id: "p1", area_id: "a1" },
  { id: "p2", area_id: "a2" },
  { id: "p3", area_id: "a1" },
  { id: "p0", area_id: "a0" },
];

describe("areasDelDia", () => {
  it("sin repetir y en el orden de tus áreas", () => {
    expect(areasDelDia(["p2", "p1", "p3", null], proyectos, areas)).toEqual([
      "Estudio",
      "Dropshipping",
    ]);
  });

  it("lo que no tiene proyecto (o uno que ya no existe) no cuenta", () => {
    expect(areasDelDia([null, undefined, "otro"], proyectos, areas)).toEqual(
      [],
    );
  });
});

describe("textoDiaDe", () => {
  it("une los nombres", () => {
    expect(textoDiaDe(["Estudio"])).toBe("Día de Estudio");
    expect(textoDiaDe(["Estudio", "Dropshipping"])).toBe(
      "Día de Estudio y Dropshipping",
    );
    expect(textoDiaDe(["Ejercicio", "Estudio", "Dropshipping"])).toBe(
      "Día de Ejercicio, Estudio y Dropshipping",
    );
  });

  it("sin áreas no dice nada", () => {
    expect(textoDiaDe([])).toBeNull();
  });
});
