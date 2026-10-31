import { describe, expect, it } from "vitest";
import { detectarAparato, guiasEnOrden } from "./instalar";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadModerno:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

describe("detectarAparato", () => {
  it("reconoce iPhone y Android", () => {
    expect(detectarAparato(UA.iphone)).toBe("iphone");
    expect(detectarAparato(UA.android)).toBe("android");
  });

  it("un Mac sin pantalla táctil es un ordenador; con pantalla táctil es un iPad", () => {
    expect(detectarAparato(UA.ipadModerno, 0)).toBe("ordenador");
    expect(detectarAparato(UA.ipadModerno, 5)).toBe("iphone");
  });

  it("todo lo demás es un ordenador", () => {
    expect(detectarAparato(UA.windows)).toBe("ordenador");
    expect(detectarAparato("")).toBe("ordenador");
  });
});

describe("guiasEnOrden", () => {
  it("pone primero la guía del aparato que usas y no repite ninguna", () => {
    const guias = guiasEnOrden("android").map((g) => g.aparato);
    expect(guias).toEqual(["android", "iphone", "ordenador"]);
  });
});
