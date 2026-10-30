import { describe, expect, it } from "vitest";
import { dominioAlQueRedirigir } from "./dominio";

describe("dominioAlQueRedirigir", () => {
  const principal = "diaclaro.vercel.app";

  it("manda el alias de producción a la dirección principal", () => {
    expect(
      dominioAlQueRedirigir({ host: "diaclaro-diaclaeo.vercel.app", entorno: "production", principal }),
    ).toBe(principal);
  });

  it("no hace nada si ya estás en la dirección principal", () => {
    expect(
      dominioAlQueRedirigir({ host: principal, entorno: "production", principal }),
    ).toBeNull();
  });

  it("no toca las vistas previas ni el ordenador", () => {
    expect(
      dominioAlQueRedirigir({ host: "diaclaro-git-rama-diaclaeo.vercel.app", entorno: "preview", principal }),
    ).toBeNull();
    expect(
      dominioAlQueRedirigir({ host: "localhost:3000", entorno: undefined, principal: undefined }),
    ).toBeNull();
  });
});
