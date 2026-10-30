import { describe, expect, it } from "vitest";
import {
  leerConservadas,
  leerMotivo,
  minutosReducidos,
  proponerDiaDificil,
  resumenConservado,
} from "./dia-dificil";
import type { TareaParaPlan } from "./plan";

// Datos de ejemplo para las pruebas (no son las tareas reales de nadie).
function tarea(
  id: string,
  minutos: number | null,
  extra: Partial<TareaParaPlan> = {},
): TareaParaPlan {
  return {
    id,
    title: id,
    kind: "tarea",
    due_date: HOY,
    estimated_minutes: minutos,
    importance: null,
    hard_deadline: false,
    created_at: `2026-10-01T10:00:0${id.length}Z`,
    tiempoPersonal: false,
    ...extra,
  };
}

const HOY = "2026-10-30";
const MANANA = "2026-10-31";

describe("leerMotivo", () => {
  it("acepta solo los motivos que existen", () => {
    expect(leerMotivo("energia")).toBe("energia");
    expect(leerMotivo("otro")).toBeNull();
    expect(leerMotivo(undefined)).toBeNull();
  });
});

describe("minutosReducidos", () => {
  it("deja la mitad, o un tercio sin energía, redondeado a 5 min", () => {
    expect(minutosReducidos(180, "tarde")).toBe(90);
    expect(minutosReducidos(180, "energia")).toBe(60);
    expect(minutosReducidos(70, "imprevisto")).toBe(35);
    expect(minutosReducidos(5, "energia")).toBe(5);
  });
});

describe("proponerDiaDificil", () => {
  it("conserva la fecha dura y la prioridad 1, aunque sean largas", () => {
    const p = proponerDiaDificil(
      [
        tarea("dura", 120, { hard_deadline: true, due_date: "2026-10-29" }),
        tarea("alta", 180, { importance: "alta" }),
      ],
      HOY,
      "tarde",
    );
    // La fecha dura va delante; "alta" pasa a ser la segunda y se reduce.
    expect(p.conservar.map((c) => c.tarea.id)).toEqual(["dura"]);
    expect(p.reducir).toEqual([
      {
        tarea: expect.objectContaining({ id: "alta" }),
        nuevosMinutos: 90,
        ahorro: 90,
      },
    ]);
  });

  it("reduce las prioridades 2 y 3 largas y conserva las cortas", () => {
    const p = proponerDiaDificil(
      [tarea("a", 30), tarea("bb", 120), tarea("ccc", 20)],
      HOY,
      "energia",
    );
    expect(p.conservar.map((c) => c.tarea.id)).toEqual(["a", "ccc"]);
    expect(p.reducir.map((r) => [r.tarea.id, r.nuevosMinutos])).toEqual([
      ["bb", 40],
    ]);
    expect(p.aplazar).toEqual([]);
    expect(p.ahorro).toBe(80);
  });

  it("aplaza a mañana lo que no es prioridad ni importante", () => {
    const p = proponerDiaDificil(
      [
        tarea("a", 30),
        tarea("bb", 30),
        tarea("ccc", 30),
        tarea("dddd", 45),
        tarea("hobby", 60, { tiempoPersonal: true }),
        tarea("sin", null, { importance: "baja" }),
      ],
      HOY,
      "imprevisto",
    );
    expect(p.aplazar.map((a) => [a.tarea.id, a.nuevaFecha])).toEqual([
      ["dddd", MANANA],
      ["sin", MANANA],
      ["hobby", MANANA],
    ]);
    // Lo que no tiene minutos se aplaza, pero no suma al ahorro.
    expect(p.ahorro).toBe(105);
  });

  it("lo importante sin minutos se conserva: no se inventa cuánto dura", () => {
    const p = proponerDiaDificil(
      [
        tarea("a", 30, { importance: "alta" }),
        tarea("bb", 30, { importance: "alta" }),
        tarea("ccc", 30, { importance: "alta" }),
        // Cuarta en el orden, pero importante: no se aplaza.
        tarea("imp", null, {
          importance: "alta",
          created_at: "2026-10-02T10:00:00Z",
        }),
      ],
      HOY,
      "tarde",
    );
    expect(p.conservar.find((c) => c.tarea.id === "imp")?.motivo).toBe(
      "Es importante (no sé cuánto dura)",
    );
  });

  it("usa lo que sueles tardar de verdad para calcular lo que liberas", () => {
    const p = proponerDiaDificil(
      [tarea("a", 30), tarea("bb", 100)],
      HOY,
      "tarde",
      { tarea: { factor: 1.5, muestras: 6 } },
    );
    // 100 min previstos son 150 de verdad; reducida a 50, son 75. Libera 75.
    expect(p.reducir[0]).toMatchObject({ nuevosMinutos: 50, ahorro: 75 });
  });
});

describe("leerConservadas", () => {
  it("se queda con los ids válidos y sin repetir", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(leerConservadas([id, id, "hola", null])).toEqual([id]);
  });
});

describe("resumenConservado", () => {
  it("separa lo conservado en hecho y pendiente, sin lo demás", () => {
    const r = resumenConservado(
      ["a", "b"],
      [
        { id: "a", done_at: "2026-10-30T12:00:00Z" },
        { id: "b", done_at: null },
        { id: "c", done_at: "2026-10-30T12:00:00Z" },
      ],
    );
    expect(r.hechas.map((t) => t.id)).toEqual(["a"]);
    expect(r.sigue.map((t) => t.id)).toEqual(["b"]);
  });
});
