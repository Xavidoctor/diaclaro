import { describe, expect, it } from "vitest";
import { leerFrases, mensajesFrasesHabito } from "./frases-habito";

describe("mensajesFrasesHabito", () => {
  it("solo manda el nombre y lo que quieres", () => {
    const [sistema, usuario] = mensajesFrasesHabito({
      titulo: "Agua",
      direccion: "mas",
    });
    expect(sistema.content).toContain("Nada de culpa");
    expect(usuario.content).toBe(
      "Hábito: Agua\nLo que quiere: Quiero hacerlo más",
    );
  });
});

describe("leerFrases", () => {
  it("lee y limpia las frases", () => {
    expect(
      leerFrases(
        JSON.stringify({
          frases: ["«Un vaso más»", "  Poco   a poco ", "un vaso más", "", 3],
        }),
      ),
    ).toEqual(["Un vaso más", "Poco a poco"]);
  });

  it("como mucho 5 y ninguna demasiado larga", () => {
    const frases = Array.from({ length: 8 }, (_, i) => `Frase ${i}`);
    frases.push("x".repeat(250));
    expect(leerFrases(JSON.stringify({ frases }))).toHaveLength(5);
  });

  it("null si no entiende la respuesta", () => {
    expect(leerFrases("hola")).toBeNull();
    expect(leerFrases(JSON.stringify({ frases: [] }))).toBeNull();
    expect(leerFrases(JSON.stringify({ otra: 1 }))).toBeNull();
  });
});
