import { describe, expect, it } from "vitest";
import { normalizarCodigo, normalizarEmail } from "./validacion";

describe("normalizarEmail", () => {
  it("acepta un email y lo pasa a minúsculas sin espacios", () => {
    expect(normalizarEmail("  Xavi@Ejemplo.com ")).toBe("xavi@ejemplo.com");
  });

  it("rechaza textos que no son un email", () => {
    expect(normalizarEmail("xavi")).toBeNull();
    expect(normalizarEmail("xavi@ejemplo")).toBeNull();
    expect(normalizarEmail("")).toBeNull();
    expect(normalizarEmail(null)).toBeNull();
  });
});

describe("normalizarCodigo", () => {
  it("acepta códigos de 6 a 8 cifras, aunque lleven espacios", () => {
    expect(normalizarCodigo("123456")).toBe("123456");
    expect(normalizarCodigo("123 456")).toBe("123456");
    expect(normalizarCodigo("12345678")).toBe("12345678");
  });

  it("rechaza códigos con letras o de longitud incorrecta", () => {
    expect(normalizarCodigo("12345")).toBeNull();
    expect(normalizarCodigo("123456789")).toBeNull();
    expect(normalizarCodigo("12a456")).toBeNull();
    expect(normalizarCodigo(undefined)).toBeNull();
  });
});
