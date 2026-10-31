import { describe, expect, it } from "vitest";
import { detallePaso, prepararPasos, textoPasos } from "./pasos";

describe("prepararPasos", () => {
  it("un paso por línea, sin números", () => {
    expect(prepararPasos("1. Abrir el temario\n2. Leer el tema 1\n")).toEqual([
      "Abrir el temario",
      "Leer el tema 1",
    ]);
  });

  it("quita líneas vacías y espacios de sobra", () => {
    expect(prepararPasos("  Abrir \n\n   \n-  Leer   ya")).toEqual([
      "Abrir",
      "Leer ya",
    ]);
  });

  it("guarda como mucho 8 pasos", () => {
    const texto = Array.from({ length: 12 }, (_, i) => `Paso ${i}`).join("\n");
    expect(prepararPasos(texto)).toHaveLength(8);
  });

  it("si no es texto, no hay pasos", () => {
    expect(prepararPasos(null)).toEqual([]);
  });

  it("textoPasos y prepararPasos se entienden entre sí", () => {
    const pasos = ["Abrir", "Leer"];
    expect(prepararPasos(textoPasos(pasos))).toEqual(pasos);
  });
});

describe("detallePaso", () => {
  it("dice de qué tarea viene", () => {
    expect(detallePaso(1, 3, "Preparar el examen")).toBe(
      "Paso 1 de 3 de «Preparar el examen».",
    );
  });
});
