import { describe, expect, it } from "vitest";
import {
  contarEtiquetas,
  esTipoNota,
  extraerEtiquetas,
  leerCampoEtiquetas,
  limpiarEtiqueta,
  tipoInicial,
} from "./etiquetas";

describe("limpiarEtiqueta", () => {
  it("quita la almohadilla, pasa a minúsculas y cambia espacios por guiones", () => {
    expect(limpiarEtiqueta(" #Aprender IA ")).toBe("aprender-ia");
  });

  it("conserva tildes y eñes", () => {
    expect(limpiarEtiqueta("Contabilidad-Básica")).toBe("contabilidad-básica");
    expect(limpiarEtiqueta("año")).toBe("año");
  });

  it("devuelve null si no queda nada", () => {
    expect(limpiarEtiqueta("#")).toBeNull();
    expect(limpiarEtiqueta("!!")).toBeNull();
  });
});

describe("extraerEtiquetas", () => {
  it("encuentra las etiquetas con # sin repetir", () => {
    expect(
      extraerEtiquetas(
        "mirar fundas #Dropshipping y #proveedores #dropshipping",
      ),
    ).toEqual(["dropshipping", "proveedores"]);
  });

  it("acepta una etiqueta al principio del texto", () => {
    expect(extraerEtiquetas("#ade repasar tema 3")).toEqual(["ade"]);
  });

  it("no confunde el # de un enlace con una etiqueta", () => {
    expect(extraerEtiquetas("ver https://web.com/#precios")).toEqual([]);
  });
});

describe("leerCampoEtiquetas", () => {
  it("separa por comas o espacios", () => {
    expect(leerCampoEtiquetas("ade, empleo #ia")).toEqual([
      "ade",
      "empleo",
      "ia",
    ]);
  });

  it("un campo vacío deja la nota sin etiquetas", () => {
    expect(leerCampoEtiquetas("  ")).toEqual([]);
    expect(leerCampoEtiquetas(null)).toEqual([]);
  });

  it("no guarda más de 20", () => {
    const muchas = Array.from({ length: 25 }, (_, i) => `e${i}`).join(",");
    expect(leerCampoEtiquetas(muchas)).toHaveLength(20);
  });
});

describe("tipoInicial", () => {
  it("es enlace si solo has pegado un enlace", () => {
    expect(
      tipoInicial(" https://drive.google.com/x ", "https://drive.google.com/x"),
    ).toBe("enlace");
  });

  it("es nota en cualquier otro caso", () => {
    expect(tipoInicial("leer https://x.com", "https://x.com")).toBe("nota");
    expect(tipoInicial("comprar pienso", null)).toBe("nota");
  });
});

describe("esTipoNota", () => {
  it("solo acepta los tipos conocidos", () => {
    expect(esTipoNota("idea")).toBe(true);
    expect(esTipoNota("tarea")).toBe(false);
  });
});

describe("contarEtiquetas", () => {
  it("cuenta y ordena de más a menos usada", () => {
    const notas = [{ tags: ["ade", "ia"] }, { tags: ["ia"] }, { tags: [] }];
    expect(contarEtiquetas(notas)).toEqual([
      { etiqueta: "ia", cuantas: 2 },
      { etiqueta: "ade", cuantas: 1 },
    ]);
  });
});
