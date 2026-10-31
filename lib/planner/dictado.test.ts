import { describe, expect, it } from "vitest";
import { juntarDictado, mensajeErrorDictado } from "./dictado";

describe("juntarDictado", () => {
  it("con el cuadro vacío, pone la primera letra en mayúscula", () => {
    expect(juntarDictado("", "llamar al dentista")).toBe("Llamar al dentista");
  });

  it("añade al final con un espacio", () => {
    expect(juntarDictado("Comprar pan", "y leche")).toBe("Comprar pan y leche");
  });

  it("no duplica espacios ni saltos de línea", () => {
    expect(juntarDictado("Comprar pan\n", "  y   leche ")).toBe(
      "Comprar pan\ny leche",
    );
  });

  it("si no has dicho nada, deja el texto como estaba", () => {
    expect(juntarDictado("Hola", "   ")).toBe("Hola");
  });
});

describe("mensajeErrorDictado", () => {
  it("no avisa si no has hablado o lo has parado tú", () => {
    expect(mensajeErrorDictado("no-speech")).toBeNull();
    expect(mensajeErrorDictado("aborted")).toBeNull();
  });

  it("explica el permiso del micrófono", () => {
    expect(mensajeErrorDictado("not-allowed")).toMatch(/permiso/);
  });

  it("tiene un mensaje para errores desconocidos", () => {
    expect(mensajeErrorDictado("raro")).toMatch(/Prueba otra vez/);
  });
});
