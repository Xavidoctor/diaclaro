import { describe, expect, it } from "vitest";
import {
  contarPendientes,
  listaDeHoy,
  tareasHechasHoy,
  textoContador,
} from "./pendientes-hoy";
import { filasDeHoy, rutinasDelDia, type Rutina } from "./rutinas";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
const HOY = "2026-10-31";

const tarea = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `Tarea ${id}`,
  kind: "tarea" as const,
  due_date: HOY,
  estimated_minutes: null,
  importance: null,
  hard_deadline: false,
  created_at: "2026-10-30T10:00:00Z",
  tiempoPersonal: false,
  ...extra,
});

const paseo: Rutina = {
  id: "r1",
  title: "Paseo",
  notes: null,
  repeat_rule: null,
  times_per_day: 2,
  duration_minutes: null,
  window_start: null,
  window_end: null,
  times_of_day: ["09:00", "20:00"],
  part_of_day: null,
  focus: false,
  focus_alarm_minutes: null,
  active: true,
};

describe("listaDeHoy", () => {
  it("junta plan, rutinas, en marcha y sin día, con lo hecho al final", () => {
    const rutinas = filasDeHoy(
      rutinasDelDia([paseo], [{ routine_id: "r1", on_date: HOY }], HOY),
    );
    const lista = listaDeHoy({
      plan: [tarea("a", { estimated_minutes: 30 }), tarea("b")],
      rutinas,
      enMarcha: [{ ...tarea("c"), due_date: "2026-11-03" }],
      sinDia: [tarea("d", { due_date: null })],
      hechas: [tarea("e")],
      hoy: HOY,
    });
    expect(lista.map((p) => p.clave)).toEqual([
      "tarea|a",
      "tarea|b",
      "rutina|r1|2",
      "tarea|c",
      "tarea|d",
      "rutina|r1|1",
      "tarea|e",
    ]);
    expect(lista[0].detalle).toBe("Prioridad 1 · Para hoy · 30 min");
    expect(lista[2].detalle).toBe("Rutina · 2.ª vez · 20:00");
    expect(lista[3].detalle).toContain("quedan 3 días");
    expect(lista[4].detalle).toBe("Sin día");
    expect(lista[5].hecha).toBe(true);
    expect(lista[6].hecha).toBe(true);
  });

  it("solo las 3 primeras del plan llevan «Prioridad»", () => {
    const lista = listaDeHoy({
      plan: ["a", "b", "c", "d"].map((id) => tarea(id)),
      rutinas: [],
      enMarcha: [],
      sinDia: [],
      hechas: [],
      hoy: HOY,
    });
    expect(lista[2].detalle).toMatch(/^Prioridad 3/);
    expect(lista[3].detalle).toBe("Para hoy");
  });
});

describe("contarPendientes y textoContador", () => {
  it("2 pendientes de 2, y al hacer una, 1 de 2", () => {
    const dos = [{ hecha: false }, { hecha: false }];
    expect(textoContador(...valores(contarPendientes(dos)))).toBe(
      "2/2 pendientes",
    );
    const una = [{ hecha: true }, { hecha: false }];
    expect(textoContador(...valores(contarPendientes(una)))).toBe(
      "1/2 pendientes",
    );
  });

  it("todo hecho y nada apuntado", () => {
    expect(textoContador(0, 3)).toBe("¡Todo hecho! 0/3 pendientes");
    expect(textoContador(0, 0)).toBe("Nada pendiente");
  });
});

describe("tareasHechasHoy", () => {
  it("cuenta lo hecho hoy y de madrugada, no lo de ayer ni lo pendiente", () => {
    const tareas = [
      { id: "1", due_date: null, done_at: "2026-10-31T10:00:00Z" },
      { id: "2", due_date: null, done_at: "2026-10-31T23:30:00Z" }, // 00:30 en Madrid
      { id: "3", due_date: HOY, done_at: "2026-10-30T10:00:00Z" },
      { id: "4", due_date: HOY, done_at: null },
    ];
    expect(
      tareasHechasHoy(tareas, HOY, "Europe/Madrid").map((t) => t.id),
    ).toEqual(["1", "2"]);
  });
});

function valores(c: { quedan: number; total: number }): [number, number] {
  return [c.quedan, c.total];
}
