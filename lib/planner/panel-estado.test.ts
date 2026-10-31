import { describe, expect, it } from "vitest";
import type { DocumentoImportante } from "./documentos-importantes";
import {
  abreElPanel,
  cierraElPanel,
  cuandoToca,
  cuandoTocaTarea,
  notasFijadas,
  ordenarCartera,
  resumenNota,
  rutinasPorHacer,
  tareasPorHacer,
} from "./panel-estado";
import type { Rutina } from "./rutinas";

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

describe("por hacer", () => {
  const hoy = "2026-11-02";
  const tarea = (titulo: string, due_date: string | null, extra = {}) => ({
    titulo,
    due_date,
    due_time: null as string | null,
    done_at: null as string | null,
    created_at: "2026-10-30T10:00:00Z",
    ...extra,
  });

  it("primero lo atrasado, luego hoy (por hora) y los próximos días", () => {
    const r = tareasPorHacer(
      [
        tarea("Luego", "2026-11-04"),
        tarea("Tarde", hoy, { due_time: "18:00" }),
        tarea("Pronto", hoy, { due_time: "09:00" }),
        tarea("Atrasada", "2026-11-01"),
        tarea("Hecha", hoy, { done_at: "2026-11-02T08:00:00Z" }),
        tarea("Sin día", null),
        tarea("Muy lejos", "2026-12-01"),
      ],
      hoy,
      10,
    );
    expect(r.lista.map((t) => t.titulo)).toEqual([
      "Atrasada",
      "Pronto",
      "Tarde",
      "Luego",
      "Sin día",
    ]);
    expect(r.sinDia).toBe(1);
    expect(r.mas).toBe(0);
  });

  it("si hay muchas, enseña unas pocas y cuenta las demás", () => {
    const r = tareasPorHacer(
      [tarea("A", hoy), tarea("B", hoy), tarea("C", hoy)],
      hoy,
      2,
    );
    expect(r.lista).toHaveLength(2);
    expect(r.mas).toBe(1);
  });

  it("dice cuándo toca", () => {
    expect(cuandoToca(hoy, hoy)).toBe("Hoy");
    expect(cuandoToca("2026-11-03", hoy)).toBe("Mañana");
    expect(cuandoToca("2026-11-01", hoy)).toBe("De ayer");
    expect(cuandoToca("2026-11-06", hoy)).toBe("6 nov");
  });
});

describe("por hacer con fecha límite y sin día", () => {
  const hoy = "2026-11-02";
  const base = {
    due_time: null,
    done_at: null,
    created_at: "2026-10-30T10:00:00Z",
  };

  it("las de fecha límite van después de las de hoy", () => {
    const r = tareasPorHacer(
      [
        {
          ...base,
          titulo: "Tema 1",
          due_date: "2026-11-06",
          due_kind: "limite" as const,
        },
        { ...base, titulo: "Hoy", due_date: hoy },
      ],
      hoy,
      10,
    );
    expect(r.lista.map((t) => t.titulo)).toEqual(["Hoy", "Tema 1"]);
  });

  it("dice cuánto queda o «Cuando puedas»", () => {
    expect(
      cuandoTocaTarea(
        { ...base, due_date: "2026-11-06", due_kind: "limite" },
        hoy,
      ),
    ).toBe("Hasta el 6 nov · quedan 4 días");
    expect(cuandoTocaTarea({ ...base, due_date: null }, hoy)).toBe(
      "Cuando puedas",
    );
  });
});

describe("rutinasPorHacer", () => {
  // Datos de ejemplo (no son los horarios reales de nadie).
  const base: Rutina = {
    id: "p",
    title: "Paseo",
    notes: null,
    repeat_rule: null,
    times_per_day: 2,
    duration_minutes: null,
    window_start: null,
    window_end: null,
    times_of_day: ["09:00", "19:00"],
    part_of_day: null,
    focus: false,
    focus_alarm_minutes: null,
    active: true,
  };

  it("una fila por vez, lo hecho al final", () => {
    const r = rutinasPorHacer(
      [base],
      [{ routine_id: "p", on_date: "2026-11-02", slot: 1 }],
      "2026-11-02",
      8,
    );
    expect(r).toEqual([
      { id: "p", titulo: "Paseo", vez: 2, hora: "19:00", hecha: false },
      { id: "p", titulo: "Paseo", vez: 1, hora: "09:00", hecha: true },
    ]);
  });

  it("las de una vez al día no llevan vez y no salen las pausadas", () => {
    const una = {
      ...base,
      id: "u",
      times_per_day: 1,
      times_of_day: null,
      window_start: "10:00",
    };
    const pausada = { ...base, id: "x", active: false };
    expect(rutinasPorHacer([una, pausada], [], "2026-11-02", 8)).toEqual([
      { id: "u", titulo: "Paseo", vez: null, hora: "10:00", hecha: false },
    ]);
  });
});
