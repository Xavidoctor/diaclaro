import { describe, expect, it } from "vitest";
import {
  anadirACola,
  leerCola,
  quitarDeCola,
  type Pendiente,
} from "./cola-sin-conexion";

const uno: Pendiente = {
  id: "1",
  texto: "llamar a la academia",
  destino: "nota",
  creado: "2026-10-30T10:00:00Z",
};

describe("cola sin conexión", () => {
  it("lee una cola vacía o rota como vacía", () => {
    expect(leerCola(null)).toEqual([]);
    expect(leerCola("esto no es json")).toEqual([]);
    expect(leerCola('[{"id":1}]')).toEqual([]);
  });

  it("guarda y vuelve a leer lo mismo", () => {
    const cola = anadirACola([], uno);
    expect(leerCola(JSON.stringify(cola))).toEqual([uno]);
  });

  it("quita solo la captura enviada", () => {
    const dos = { ...uno, id: "2", texto: "otra" };
    expect(quitarDeCola([uno, dos], "1")).toEqual([dos]);
  });
});
