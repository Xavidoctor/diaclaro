import { describe, expect, it } from "vitest";
import { planDeCopias } from "./copias-movil";

const ficha = (id: string, nombre = id, tipo = "otros") => ({
  id,
  nombre,
  tipo,
  mime: "image/png",
});

describe("planDeCopias", () => {
  it("baja lo nuevo y borra lo que ya no está en Drive", () => {
    expect(
      planDeCopias([ficha("a"), ficha("b")], [ficha("b"), ficha("c")]),
    ).toEqual({ bajar: ["a"], actualizar: [], borrar: ["c"] });
  });

  it("actualiza el nombre o el tipo sin volver a bajar el archivo", () => {
    const nuevo = ficha("a", "DNI", "identidad");
    expect(planDeCopias([nuevo], [ficha("a")])).toEqual({
      bajar: [],
      actualizar: [nuevo],
      borrar: [],
    });
  });

  it("si todo coincide, no hace nada", () => {
    expect(planDeCopias([ficha("a")], [ficha("a")])).toEqual({
      bajar: [],
      actualizar: [],
      borrar: [],
    });
  });
});
