import { describe, expect, it } from "vitest";
import { MAX_CARACTERES_RESUMEN, mensajesResumirNotas } from "./resumir-notas";

describe("mensajesResumirNotas", () => {
  it("manda el proyecto y sus notas", () => {
    const { mensajes, incluidas } = mensajesResumirNotas({
      proyecto: "Mates",
      notas: ["Repasar tema 3", "  ", "Preguntar por el examen"],
    });
    expect(incluidas).toBe(2);
    expect(mensajes[0].content).toContain("no añadas datos");
    expect(mensajes[1].content).toContain("Proyecto: Mates");
    expect(mensajes[1].content).toContain(
      'Nota 2:\n"""Preguntar por el examen"""',
    );
  });

  it("no pasa del límite de caracteres", () => {
    const larga = "a".repeat(MAX_CARACTERES_RESUMEN - 10);
    const { incluidas } = mensajesResumirNotas({
      proyecto: "X",
      notas: [larga, "otra nota más"],
    });
    expect(incluidas).toBe(1);
  });

  it("recorta una nota enorme pero la manda", () => {
    const { mensajes, incluidas } = mensajesResumirNotas({
      proyecto: "X",
      notas: ["b".repeat(MAX_CARACTERES_RESUMEN * 2)],
    });
    expect(incluidas).toBe(1);
    expect(mensajes[1].content.length).toBeLessThan(
      MAX_CARACTERES_RESUMEN + 100,
    );
  });
});
