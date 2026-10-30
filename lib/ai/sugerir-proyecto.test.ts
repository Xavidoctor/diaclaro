import { describe, expect, it } from "vitest";
import { leerSugerencia, mensajesSugerirProyecto } from "./sugerir-proyecto";

const proyectos = [
  { id: "a", nombre: "Matemáticas", area: "Estudios" },
  { id: "b", nombre: "Buscar trabajo", area: "Empleo" },
];

describe("mensajesSugerirProyecto", () => {
  it("manda la nota y los proyectos con su código", () => {
    const mensajes = mensajesSugerirProyecto({
      nota: "Repasar derivadas",
      proyectos,
    });
    expect(mensajes[1].content).toContain("P1: Matemáticas (área Estudios)");
    expect(mensajes[1].content).toContain("P2: Buscar trabajo (área Empleo)");
    expect(mensajes[1].content).toContain('"""Repasar derivadas"""');
  });
});

describe("leerSugerencia", () => {
  it("convierte el código en el proyecto", () => {
    expect(
      leerSugerencia(
        '```json\n{"proyecto":"P2","motivo":"Habla de una oferta"}\n```',
        proyectos,
      ),
    ).toEqual({ proyecto: proyectos[1], motivo: "Habla de una oferta" });
  });

  it("acepta que no encaje ninguno", () => {
    expect(leerSugerencia('{"proyecto":null}', proyectos)).toEqual({
      proyecto: null,
      motivo: null,
    });
  });

  it("no deja inventar proyectos", () => {
    expect(leerSugerencia('{"proyecto":"P9"}', proyectos)?.proyecto).toBe(null);
    expect(leerSugerencia('{"proyecto":"Física"}', proyectos)?.proyecto).toBe(
      null,
    );
  });

  it("devuelve null si no se entiende", () => {
    expect(leerSugerencia("No sé", proyectos)).toBe(null);
    expect(leerSugerencia('{"otra":"cosa"}', proyectos)).toBe(null);
  });
});
