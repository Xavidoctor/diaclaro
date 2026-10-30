import { describe, expect, it } from "vitest";
import type { DocumentoImportante } from "./documentos-importantes";
import {
  abreElPanel,
  cierraElPanel,
  notasFijadas,
  ordenarCartera,
  resumenNota,
} from "./panel-estado";

describe("el gesto de deslizar", () => {
  const ancho = 400;

  it("abre al deslizar de derecha a izquierda desde la mitad derecha", () => {
    expect(abreElPanel({ x0: 380, y0: 300, x1: 240, y1: 320 }, ancho)).toBe(
      true,
    );
  });

  it("no abre si el dedo se mueve poco", () => {
    expect(abreElPanel({ x0: 380, y0: 300, x1: 340, y1: 300 }, ancho)).toBe(
      false,
    );
  });

  it("no abre al bajar por la pantalla aunque se tuerza un poco", () => {
    expect(abreElPanel({ x0: 380, y0: 100, x1: 290, y1: 400 }, ancho)).toBe(
      false,
    );
  });

  it("no abre si empiezas en la mitad izquierda", () => {
    expect(abreElPanel({ x0: 140, y0: 300, x1: 10, y1: 300 }, ancho)).toBe(
      false,
    );
  });

  it("no abre al deslizar de izquierda a derecha", () => {
    expect(abreElPanel({ x0: 220, y0: 300, x1: 380, y1: 300 }, ancho)).toBe(
      false,
    );
  });

  it("cierra al deslizar de izquierda a derecha", () => {
    expect(cierraElPanel({ x0: 100, y0: 300, x1: 300, y1: 310 })).toBe(true);
    expect(cierraElPanel({ x0: 300, y0: 300, x1: 100, y1: 310 })).toBe(false);
  });
});

describe("notasFijadas", () => {
  const notas = [
    { id: "a", body: "nueva", pinned: false },
    { id: "b", body: "fijada", pinned: true },
    { id: "c", body: "otra fijada", pinned: true },
  ];

  it("solo deja las fijadas, en el mismo orden", () => {
    expect(notasFijadas(notas, 5).map((n) => n.id)).toEqual(["b", "c"]);
  });

  it("no pasa del número pedido", () => {
    expect(notasFijadas(notas, 1)).toHaveLength(1);
  });
});

describe("resumenNota", () => {
  it("se queda con la primera línea", () => {
    expect(resumenNota("  Comprar pan\ny leche")).toBe("Comprar pan");
  });

  it("corta las líneas largas con puntos suspensivos", () => {
    expect(resumenNota("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("avisa si la nota está vacía", () => {
    expect(resumenNota("   ")).toBe("Nota sin texto");
  });
});

describe("ordenarCartera", () => {
  const doc = (
    id: string,
    tipo: DocumentoImportante["tipo"],
    creado: string,
  ): DocumentoImportante => ({
    id,
    nombre: id,
    tipo,
    mime: "image/png",
    enlace: "https://drive.google.com/x",
    miniatura: null,
    creado,
  });

  it("pone el DNI primero y, dentro de cada tipo, el más nuevo", () => {
    const orden = ordenarCartera([
      doc("entrada", "entradas", "2026-10-01"),
      doc("billete-viejo", "viajes", "2026-09-01"),
      doc("dni", "identidad", "2026-01-01"),
      doc("billete-nuevo", "viajes", "2026-10-20"),
    ]).map((d) => d.id);
    expect(orden).toEqual(["dni", "billete-nuevo", "billete-viejo", "entrada"]);
  });
});
