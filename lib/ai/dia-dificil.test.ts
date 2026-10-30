import { describe, expect, it } from "vitest";
import {
  leerMotivoIA,
  mensajesElegirMotivo,
  mensajesExplicarDia,
} from "./dia-dificil";

describe("elegir el motivo", () => {
  it("manda solo tu texto, recortado", () => {
    const [, usuario] = mensajesElegirMotivo("x".repeat(800));
    expect(usuario.content.length).toBeLessThan(520);
  });

  it("lee el motivo de la respuesta", () => {
    expect(leerMotivoIA('{"motivo":"energia"}')).toBe("energia");
    expect(leerMotivoIA('```json\n{ "motivo": "Tarde" }\n```')).toBe("tarde");
  });

  it("no acepta motivos que no existen", () => {
    expect(leerMotivoIA('{"motivo":"lluvia"}')).toBeNull();
    expect(leerMotivoIA("No lo sé")).toBeNull();
  });
});

describe("mensajesExplicarDia", () => {
  it("lleva solo lo que ha calculado la app", () => {
    const [sistema, usuario] = mensajesExplicarDia({
      motivo: "imprevisto",
      agenda: ["Tutoría"],
      rutinas: ["Paseo del perro"],
      conservar: [
        { titulo: "Entregar práctica", motivo: "Fecha que no se puede mover" },
      ],
      reducir: [{ titulo: "Repasar tema 3", de: 120, a: 60 }],
      aplazar: [{ titulo: "Ordenar apuntes" }],
      ahorro: 105,
    });
    expect(sistema.content).toContain("no inventes");
    expect(usuario.content).toContain("Motivo: Ha surgido algo.");
    expect(usuario.content).toContain("Tutoría");
    expect(usuario.content).toContain("Repasar tema 3 (de 2 h a 1 h)");
    expect(usuario.content).toContain("Deja para mañana: Ordenar apuntes.");
    expect(usuario.content).toContain("unas 1 h 45 min");
  });

  it("dice si no hay nada que conservar", () => {
    const [, usuario] = mensajesExplicarDia({
      motivo: "energia",
      agenda: [],
      rutinas: [],
      conservar: [],
      reducir: [],
      aplazar: [],
      ahorro: 0,
    });
    expect(usuario.content).toBe(
      "Motivo: No tengo energía.\nNo hay tareas que conservar.",
    );
  });
});
