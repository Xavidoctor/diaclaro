import { describe, expect, it } from "vitest";
import { enlaceDeVuelta, normalizarEmail } from "./validacion";

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

describe("enlaceDeVuelta", () => {
  it("usa la cabecera origin si existe", () => {
    expect(
      enlaceDeVuelta({ origin: "https://diaclaro.vercel.app", host: "otro", proto: "http" }),
    ).toBe("https://diaclaro.vercel.app/auth/confirm");
  });

  it("si no hay origin, lo monta con el host y el protocolo", () => {
    expect(
      enlaceDeVuelta({ origin: null, host: "localhost:3000", proto: "http" }),
    ).toBe("http://localhost:3000/auth/confirm");
    expect(
      enlaceDeVuelta({ origin: null, host: "diaclaro.vercel.app", proto: null }),
    ).toBe("https://diaclaro.vercel.app/auth/confirm");
  });

  it("devuelve null si no hay ningún dato", () => {
    expect(enlaceDeVuelta({ origin: null, host: null, proto: null })).toBeNull();
  });
});
