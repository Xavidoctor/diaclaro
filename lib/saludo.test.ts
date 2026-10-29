import { describe, expect, it } from "vitest";
import { saludo } from "./saludo";

describe("saludo", () => {
  it("da los buenos días por la mañana", () => {
    expect(saludo(6)).toBe("Buenos días");
    expect(saludo(10)).toBe("Buenos días");
    expect(saludo(13)).toBe("Buenos días");
  });

  it("da las buenas tardes desde las 14:00", () => {
    expect(saludo(14)).toBe("Buenas tardes");
    expect(saludo(20)).toBe("Buenas tardes");
  });

  it("da las buenas noches de noche y de madrugada", () => {
    expect(saludo(21)).toBe("Buenas noches");
    expect(saludo(0)).toBe("Buenas noches");
    expect(saludo(5)).toBe("Buenas noches");
  });
});
