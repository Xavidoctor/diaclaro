import { describe, expect, it } from "vitest";
import { SECCIONES_GUIA, seccionDeRuta } from "./guia";

describe("guía de uso", () => {
  it("cada sección tiene un id distinto", () => {
    const ids = SECCIONES_GUIA.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada sección tiene título, resumen y al menos un paso", () => {
    for (const s of SECCIONES_GUIA) {
      expect(s.titulo).not.toBe("");
      expect(s.resumen).not.toBe("");
      expect(s.pasos.length).toBeGreaterThan(0);
    }
  });

  it("los enlaces van a pantallas de la app", () => {
    for (const s of SECCIONES_GUIA) {
      if (s.enlace) expect(s.enlace.href.startsWith("/")).toBe(true);
    }
  });
});

describe("seccionDeRuta", () => {
  it("la portada es Hoy", () => {
    expect(seccionDeRuta("/")?.id).toBe("hoy");
  });

  it("encuentra la sección de cada pantalla", () => {
    expect(seccionDeRuta("/bandeja")?.id).toBe("bandeja");
    expect(seccionDeRuta("/agenda")?.id).toBe("agenda");
  });

  it("vale también para pantallas de dentro y con filtros", () => {
    expect(seccionDeRuta("/areas/123")?.id).toBe("areas");
    expect(seccionDeRuta("/bandeja?pestana=tareas")?.id).toBe("bandeja");
  });

  it("da null si la pantalla no tiene explicación", () => {
    expect(seccionDeRuta("/login")).toBeNull();
  });
});
