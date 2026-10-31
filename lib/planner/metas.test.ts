import { describe, expect, it } from "vitest";
import {
  metasProximas,
  ordenarMetas,
  partirAviso,
  prepararMeta,
  textoAviso,
  textoFalta,
  tiposParaProyecto,
  type Meta,
} from "./metas";

// Datos de ejemplo para las pruebas (no son las fechas reales de nadie).
const HOY = "2026-11-02";

function meta(id: string, cambios: Partial<Meta> = {}): Meta {
  return {
    id,
    project_id: "p",
    title: id,
    kind: "meta",
    due_date: null,
    remind_at: null,
    done_at: null,
    ...cambios,
  };
}

const vacio = {
  title: "Parcial",
  kind: "examen",
  due_date: "",
  aviso_dia: "",
  aviso_hora: "",
};

describe("tiposParaProyecto", () => {
  it("una asignatura tiene entregas, exámenes y metas; un proyecto, solo metas", () => {
    expect(tiposParaProyecto("asignatura")).toEqual([
      "entrega",
      "examen",
      "meta",
    ]);
    expect(tiposParaProyecto("proyecto")).toEqual(["meta"]);
  });
});

describe("prepararMeta", () => {
  it("sin fecha ni aviso se deja vacío (no se inventa nada)", () => {
    expect(prepararMeta(vacio)).toEqual({
      ok: true,
      valor: {
        title: "Parcial",
        kind: "examen",
        due_date: null,
        remind_at: null,
      },
    });
  });

  it("guarda la fecha y junta el día y la hora del aviso", () => {
    const r = prepararMeta({
      ...vacio,
      due_date: "2026-11-20",
      aviso_dia: "2026-11-18",
      aviso_hora: "09:30",
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        title: "Parcial",
        kind: "examen",
        due_date: "2026-11-20",
        remind_at: "2026-11-18T09:30:00",
      },
    });
  });

  it("el aviso necesita día y hora a la vez", () => {
    expect(prepararMeta({ ...vacio, aviso_dia: "2026-11-18" }).ok).toBe(false);
    expect(prepararMeta({ ...vacio, aviso_hora: "09:30" }).ok).toBe(false);
  });

  it("sin tipo es una meta; rechaza títulos vacíos, tipos y fechas raras", () => {
    expect(prepararMeta({ ...vacio, kind: "" })).toMatchObject({
      ok: true,
      valor: { kind: "meta" },
    });
    expect(prepararMeta({ ...vacio, title: "  " }).ok).toBe(false);
    expect(prepararMeta({ ...vacio, kind: "fiesta" }).ok).toBe(false);
    expect(prepararMeta({ ...vacio, due_date: "2026-02-30" }).ok).toBe(false);
    expect(
      prepararMeta({ ...vacio, aviso_dia: "2026-11-18", aviso_hora: "25:00" })
        .ok,
    ).toBe(false);
  });
});

describe("aviso", () => {
  it("parte el aviso para el formulario y lo describe", () => {
    expect(partirAviso("2026-11-18T09:30:00")).toEqual({
      dia: "2026-11-18",
      hora: "09:30",
    });
    expect(partirAviso(null)).toEqual({ dia: "", hora: "" });
    expect(textoAviso("2026-11-18T09:30:00")).toBe(
      "Aviso el 18 nov a las 09:30",
    );
    expect(textoAviso(null)).toBeNull();
  });
});

describe("textoFalta", () => {
  it("dice cuánto falta o cuánto hace", () => {
    expect(textoFalta(HOY, HOY)).toBe("Hoy");
    expect(textoFalta("2026-11-03", HOY)).toBe("Mañana");
    expect(textoFalta("2026-11-09", HOY)).toBe("En 7 días");
    expect(textoFalta("2026-11-01", HOY)).toBe("Ayer");
    expect(textoFalta("2026-10-30", HOY)).toBe("Hace 3 días");
  });
});

describe("ordenarMetas y metasProximas", () => {
  const metas = [
    meta("hecha", { due_date: "2026-11-03", done_at: "2026-11-01T10:00:00Z" }),
    meta("sin fecha"),
    meta("lejos", { due_date: "2026-12-20" }),
    meta("pronto", { due_date: "2026-11-05" }),
    meta("pasada", { due_date: "2026-10-30" }),
  ];

  it("primero las que tienen fecha, luego sin fecha y al final las hechas", () => {
    expect(ordenarMetas(metas).map((m) => m.id)).toEqual([
      "pasada",
      "pronto",
      "lejos",
      "sin fecha",
      "hecha",
    ]);
  });

  it("en Hoy salen las pendientes de los próximos 14 días y las pasadas", () => {
    expect(metasProximas(metas, HOY).map((m) => m.id)).toEqual([
      "pasada",
      "pronto",
    ]);
  });
});
