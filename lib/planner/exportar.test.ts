import { describe, expect, it } from "vitest";
import { TABLAS, armarCopia, contarFilas, nombreArchivo } from "./exportar";

const ahora = new Date("2026-10-30T10:00:00Z");

describe("armarCopia", () => {
  it("junta las tablas y quita las columnas calculadas", () => {
    const copia = armarCopia(
      {
        notes: [{ id: "n1", body: "Hola", search: "'hol':1" }],
        tasks: [{ id: "t1", title: "Repasar" }],
      },
      [],
      ahora,
    );
    expect(copia).toEqual({
      app: "DíaClaro",
      version: 1,
      exportada_el: "2026-10-30T10:00:00.000Z",
      avisos: [],
      tablas: {
        notes: [{ id: "n1", body: "Hola" }],
        tasks: [{ id: "t1", title: "Repasar" }],
      },
    });
  });

  it("guarda los avisos y cuenta las filas", () => {
    const copia = armarCopia(
      { tasks: [{ id: "a" }, { id: "b" }], areas: [] },
      ["day_reviews: la tabla aún no existe"],
      ahora,
    );
    expect(copia.avisos).toHaveLength(1);
    expect(contarFilas(copia)).toBe(2);
  });

  it("copia todas las tablas una sola vez", () => {
    expect(new Set(TABLAS).size).toBe(TABLAS.length);
  });
});

describe("nombreArchivo", () => {
  it("lleva la fecha", () => {
    expect(nombreArchivo("2026-10-30")).toBe("diaclaro-copia-2026-10-30.json");
  });
});
