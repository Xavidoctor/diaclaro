import { describe, expect, it } from "vitest";
import {
  marcarTiempoPersonal,
  motivoOrden,
  nivel,
  ordenarTareas,
  planDelDia,
  type TareaParaPlan,
} from "./plan";

// Datos de ejemplo para las pruebas (no son las tareas reales de nadie).
function tarea(id: string, extra: Partial<TareaParaPlan> = {}): TareaParaPlan {
  return {
    id,
    title: id,
    kind: "tarea",
    due_date: HOY,
    estimated_minutes: null,
    importance: null,
    hard_deadline: false,
    created_at: "2026-10-01T10:00:00Z",
    tiempoPersonal: false,
    ...extra,
  };
}

const HOY = "2026-10-30";
const ids = (lista: TareaParaPlan[]) => lista.map((t) => t.id);

describe("nivel", () => {
  it("la fecha dura de hoy o atrasada va la primera", () => {
    expect(nivel(tarea("a", { hard_deadline: true }), HOY)).toBe(0);
    expect(
      nivel(tarea("a", { hard_deadline: true, due_date: "2026-10-28" }), HOY),
    ).toBe(0);
  });

  it("una fecha dura de otro día no cuenta como urgente", () => {
    expect(
      nivel(tarea("a", { hard_deadline: true, due_date: "2026-11-02" }), HOY),
    ).toBe(2);
  });

  it("el tiempo personal va al final, salvo si es importante", () => {
    expect(nivel(tarea("a", { tiempoPersonal: true }), HOY)).toBe(4);
    expect(
      nivel(tarea("a", { tiempoPersonal: true, importance: "alta" }), HOY),
    ).toBe(1);
  });
});

describe("ordenarTareas", () => {
  it("ordena por fecha dura, importancia y tiempo personal", () => {
    const orden = ordenarTareas(
      [
        tarea("hobby", { tiempoPersonal: true }),
        tarea("baja", { importance: "baja" }),
        tarea("normal"),
        tarea("alta", { importance: "alta" }),
        tarea("dura", { hard_deadline: true }),
      ],
      HOY,
    );
    expect(ids(orden)).toEqual(["dura", "alta", "normal", "baja", "hobby"]);
  });

  it("con el mismo nivel, primero las atrasadas y luego las entregas", () => {
    const orden = ordenarTareas(
      [
        tarea("hoy"),
        tarea("entrega", { kind: "entrega" }),
        tarea("atrasada", { due_date: "2026-10-29" }),
      ],
      HOY,
    );
    expect(ids(orden)).toEqual(["atrasada", "entrega", "hoy"]);
  });

  it("si todo empata, va antes la que apuntaste antes", () => {
    const orden = ordenarTareas(
      [
        tarea("nueva", { created_at: "2026-10-29T10:00:00Z" }),
        tarea("vieja", { created_at: "2026-10-20T10:00:00Z" }),
      ],
      HOY,
    );
    expect(ids(orden)).toEqual(["vieja", "nueva"]);
  });

  it("no cambia la lista original", () => {
    const lista = [tarea("b", { importance: "baja" }), tarea("a")];
    ordenarTareas(lista, HOY);
    expect(ids(lista)).toEqual(["b", "a"]);
  });
});

describe("planDelDia", () => {
  it("saca 3 prioridades, el resto y la siguiente tarea", () => {
    const plan = planDelDia(
      [
        tarea("e", { importance: "baja" }),
        tarea("a", { importance: "alta" }),
        tarea("b"),
        tarea("c"),
        tarea("d"),
      ],
      HOY,
    );
    expect(ids(plan.prioridades)).toEqual(["a", "b", "c"]);
    expect(ids(plan.resto)).toEqual(["d", "e"]);
    expect(plan.siguiente?.id).toBe("a");
  });

  it("sin tareas no hay siguiente", () => {
    expect(planDelDia([], HOY)).toEqual({
      prioridades: [],
      resto: [],
      siguiente: null,
    });
  });
});

describe("motivoOrden", () => {
  it("explica por qué va en ese sitio", () => {
    expect(motivoOrden(tarea("a", { hard_deadline: true }), HOY)).toBe(
      "Fecha que no se puede mover",
    );
    expect(motivoOrden(tarea("a", { due_date: "2026-10-29" }), HOY)).toBe(
      "Atrasada",
    );
    expect(motivoOrden(tarea("a", { kind: "entrega" }), HOY)).toBe(
      "Entrega para hoy",
    );
  });
});

describe("marcarTiempoPersonal", () => {
  it("marca las tareas de proyectos de un área de tiempo personal", () => {
    const r = marcarTiempoPersonal(
      [
        { id: "hobby", project_id: "p1" },
        { id: "estudio", project_id: "p2" },
        { id: "suelta", project_id: null },
      ],
      [
        { id: "a1", personal_time: true },
        { id: "a2", personal_time: false },
      ],
      [
        { id: "p1", area_id: "a1" },
        { id: "p2", area_id: "a2" },
      ],
    );
    expect(r.map((t) => t.tiempoPersonal)).toEqual([true, false, false]);
  });
});
