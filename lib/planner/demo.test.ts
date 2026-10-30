import { describe, expect, it } from "vitest";
import {
  emailDemo,
  leerNumeroDemo,
  MAX_USOS_IA_DEMO,
  MAX_USOS_IA_DIA,
  topeUsosIA,
} from "./demo";

describe("emailDemo", () => {
  it("da el email de cada cuenta", () => {
    expect(emailDemo(1)).toBe("demo1@example.com");
    expect(emailDemo(3)).toBe("demo3@example.com");
  });
});

describe("leerNumeroDemo", () => {
  it("acepta 1, 2 y 3", () => {
    expect(leerNumeroDemo("1")).toBe(1);
    expect(leerNumeroDemo(" 2 ")).toBe(2);
    expect(leerNumeroDemo("3")).toBe(3);
  });

  it("rechaza cualquier otra cosa", () => {
    expect(leerNumeroDemo("0")).toBeNull();
    expect(leerNumeroDemo("4")).toBeNull();
    expect(leerNumeroDemo("1.5")).toBeNull();
    expect(leerNumeroDemo("")).toBeNull();
    expect(leerNumeroDemo("demo")).toBeNull();
    expect(leerNumeroDemo(null)).toBeNull();
  });
});

describe("topeUsosIA", () => {
  it("las cuentas demo tienen menos usos de la IA", () => {
    expect(topeUsosIA(true)).toBe(MAX_USOS_IA_DEMO);
    expect(topeUsosIA(false)).toBe(MAX_USOS_IA_DIA);
    expect(MAX_USOS_IA_DEMO).toBeLessThan(MAX_USOS_IA_DIA);
  });
});
