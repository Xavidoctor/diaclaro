import { describe, expect, it } from "vitest";
import { leerPasos, mensajesDividirTarea } from "./dividir-tarea";

describe("mensajesDividirTarea", () => {
  it("envía solo el título y la descripción de la tarea", () => {
    const m = mensajesDividirTarea({
      titulo: "Preparar el examen de Contabilidad",
      detalles: "Temas 1 a 4",
    });
    expect(m).toHaveLength(2);
    expect(m[1].content).toContain("Preparar el examen de Contabilidad");
    expect(m[1].content).toContain("Temas 1 a 4");
  });

  it("pide que no ponga fechas ni duraciones", () => {
    const [sistema] = mensajesDividirTarea({ titulo: "X", detalles: null });
    expect(sistema.content).toMatch(/No pongas fechas, horas, minutos/);
  });
});

describe("leerPasos", () => {
  it("lee los pasos en orden", () => {
    expect(
      leerPasos(
        '{"pasos":["Abrir el temario","Leer el tema 1","Hacer un resumen"]}',
      ),
    ).toEqual(["Abrir el temario", "Leer el tema 1", "Hacer un resumen"]);
  });

  it("quita números y viñetas del principio", () => {
    expect(leerPasos('{"pasos":["1. Abrir","2) Leer","- Resumir"]}')).toEqual([
      "Abrir",
      "Leer",
      "Resumir",
    ]);
  });

  it("quita pasos vacíos y repetidos", () => {
    expect(leerPasos('{"pasos":["Abrir","  ","abrir","Leer"]}')).toEqual([
      "Abrir",
      "Leer",
    ]);
  });

  it("deja como mucho 6 pasos", () => {
    const pasos = Array.from({ length: 9 }, (_, i) => `"Paso ${i + 1}"`);
    expect(leerPasos(`{"pasos":[${pasos.join(",")}]}`)).toHaveLength(6);
  });

  it("con un solo paso, entiende que no hace falta dividir", () => {
    expect(leerPasos('{"pasos":["Llamar"]}')).toEqual([]);
    expect(leerPasos('{"pasos":[]}')).toEqual([]);
  });

  it("si no entiende la respuesta, devuelve null", () => {
    expect(leerPasos("no sé")).toBeNull();
    expect(leerPasos('{"otra":1}')).toBeNull();
  });

  it("acepta texto alrededor del JSON", () => {
    expect(
      leerPasos('Aquí tienes: {"pasos":["Abrir","Leer"]} ¡Ánimo!'),
    ).toEqual(["Abrir", "Leer"]);
  });
});
