import { describe, expect, it } from "vitest";
import { FRASES_SUGERIDAS, prepararPerfil, saludoConNombre } from "./perfil";

describe("saludoConNombre", () => {
  it("añade el nombre después de una coma", () => {
    expect(saludoConNombre("Buenas tardes", "Xavi")).toBe(
      "Buenas tardes, Xavi",
    );
  });
  it("sin nombre deja solo el saludo", () => {
    expect(saludoConNombre("Buenos días", null)).toBe("Buenos días");
    expect(saludoConNombre("Buenos días", "   ")).toBe("Buenos días");
  });
});

describe("prepararPerfil", () => {
  it("todo vacío se guarda como vacío", () => {
    expect(
      prepararPerfil({ display_name: "", age: "", about: " ", motto: null }),
    ).toEqual({
      ok: true,
      valor: { display_name: null, age: null, about: null, motto: null },
    });
  });
  it("limpia espacios y convierte la edad en número", () => {
    const r = prepararPerfil({
      display_name: "  Ana ",
      age: "31",
      about: "Estudio idiomas",
      motto: "Poco a poco",
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        display_name: "Ana",
        age: 31,
        about: "Estudio idiomas",
        motto: "Poco a poco",
      },
    });
  });
  it("rechaza una edad que no es válida", () => {
    for (const age of ["0", "200", "2.5", "abc"]) {
      const r = prepararPerfil({ display_name: "", age, about: "", motto: "" });
      expect(r.ok).toBe(false);
    }
  });
  it("rechaza un nombre demasiado largo", () => {
    const r = prepararPerfil({
      display_name: "a".repeat(41),
      age: "",
      about: "",
      motto: "",
    });
    expect(r.ok).toBe(false);
  });
  it("las frases sugeridas caben en el límite", () => {
    for (const f of FRASES_SUGERIDAS) expect(f.length).toBeLessThanOrEqual(160);
  });
  it("ninguna frase habla de tabaco", () => {
    for (const f of FRASES_SUGERIDAS)
      expect(f.toLowerCase()).not.toMatch(/fum|tabaco|cigarr/);
  });
});
