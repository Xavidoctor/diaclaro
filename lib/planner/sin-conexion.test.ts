import { describe, expect, it } from "vitest";
import { CADA_CUANTO_GUARDAR_MS, deCuandoEsLaCopia, tocaGuardar } from "./sin-conexion";

describe("tocaGuardar", () => {
  it("guarda la primera vez y luego cada media hora", () => {
    expect(tocaGuardar(null, 1000)).toBe(true);
    expect(tocaGuardar(1000, 1000 + CADA_CUANTO_GUARDAR_MS - 1)).toBe(false);
    expect(tocaGuardar(1000, 1000 + CADA_CUANTO_GUARDAR_MS)).toBe(true);
  });

  it("si la hora del móvil va hacia atrás, guarda otra vez", () => {
    expect(tocaGuardar(5000, 1000)).toBe(true);
  });
});

describe("deCuandoEsLaCopia", () => {
  const ahora = new Date(2026, 9, 31, 10, 0);

  it("dice la hora si es de hoy", () => {
    expect(deCuandoEsLaCopia(new Date(2026, 9, 31, 9, 5).toISOString(), ahora)).toBe(
      "de las 09:05",
    );
  });

  it("dice «ayer» o la fecha si es más antigua", () => {
    expect(deCuandoEsLaCopia(new Date(2026, 9, 30, 21, 30).toISOString(), ahora)).toBe(
      "de ayer a las 21:30",
    );
    expect(deCuandoEsLaCopia(new Date(2026, 9, 28, 18, 0).toISOString(), ahora)).toBe(
      "del 28/10 a las 18:00",
    );
  });

  it("sin fecha o con una fecha rota, no dice nada", () => {
    expect(deCuandoEsLaCopia(null, ahora)).toBeNull();
    expect(deCuandoEsLaCopia("no es fecha", ahora)).toBeNull();
  });
});
