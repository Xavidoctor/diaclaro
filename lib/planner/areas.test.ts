import { describe, expect, it } from "vitest";
import {
  horasAMinutos,
  minutosAHorasTexto,
  moverEnLista,
  ordenarAreas,
  ordenarProyectos,
  prepararArea,
  prepararProyecto,
  resumenSemana,
  textoHoras,
  textoPresupuesto,
  type Area,
  type Proyecto,
} from "./areas";

// Datos de ejemplo para las pruebas (no son las horas reales de nadie).
function area(cambios: Partial<Area>): Area {
  return {
    id: "a",
    name: "Área",
    weekly_minutes: null,
    personal_time: false,
    position: 0,
    archived_at: null,
    ...cambios,
  };
}

function proyecto(cambios: Partial<Proyecto>): Proyecto {
  return {
    id: "p",
    area_id: "a",
    name: "Proyecto",
    kind: "proyecto",
    notes: null,
    url: null,
    archived_at: null,
    ...cambios,
  };
}

describe("horasAMinutos", () => {
  it("convierte horas en minutos, con coma o punto", () => {
    expect(horasAMinutos("6")).toBe(360);
    expect(horasAMinutos("1,5")).toBe(90);
    expect(horasAMinutos(" 1.25 ")).toBe(75);
  });
  it("vacío es null (sin presupuesto)", () => {
    expect(horasAMinutos("")).toBeNull();
    expect(horasAMinutos("   ")).toBeNull();
  });
  it("lo que no es un número da NaN", () => {
    expect(horasAMinutos("seis")).toBeNaN();
    expect(horasAMinutos("-2")).toBeNaN();
  });
});

describe("textos de horas", () => {
  it("textoHoras", () => {
    expect(textoHoras(360)).toBe("6 h");
    expect(textoHoras(90)).toBe("1 h 30 min");
    expect(textoHoras(45)).toBe("45 min");
  });
  it("minutosAHorasTexto", () => {
    expect(minutosAHorasTexto(90)).toBe("1,5");
    expect(minutosAHorasTexto(360)).toBe("6");
    expect(minutosAHorasTexto(null)).toBe("");
  });
  it("textoPresupuesto distingue el tiempo personal", () => {
    expect(
      textoPresupuesto({ weekly_minutes: 360, personal_time: false }),
    ).toBe("6 h a la semana");
    expect(textoPresupuesto({ weekly_minutes: 120, personal_time: true })).toBe(
      "Tiempo personal · hasta 2 h a la semana",
    );
    expect(
      textoPresupuesto({ weekly_minutes: null, personal_time: true }),
    ).toBe("Tiempo personal, sin objetivo");
    expect(
      textoPresupuesto({ weekly_minutes: null, personal_time: false }),
    ).toBe("Sin horas fijadas");
  });
});

describe("resumenSemana", () => {
  it("separa el compromiso del tiempo personal y salta archivadas y vacías", () => {
    const r = resumenSemana([
      area({ weekly_minutes: 600 }),
      area({ weekly_minutes: 120 }),
      area({ weekly_minutes: 180, personal_time: true }),
      area({ weekly_minutes: null }),
      area({ weekly_minutes: 300, archived_at: "2026-10-01T00:00:00Z" }),
    ]);
    expect(r).toEqual({ compromiso: 720, personal: 180 });
  });
});

describe("orden", () => {
  it("áreas por posición, archivadas al final", () => {
    const lista = ordenarAreas([
      area({ id: "x", position: 0, archived_at: "2026-10-01T00:00:00Z" }),
      area({ id: "b", position: 2 }),
      area({ id: "a", position: 1 }),
    ]);
    expect(lista.map((a) => a.id)).toEqual(["a", "b", "x"]);
  });
  it("proyectos: asignaturas primero, por nombre, archivados al final", () => {
    const lista = ordenarProyectos([
      proyecto({ id: "1", name: "Web" }),
      proyecto({ id: "2", name: "Zeta", kind: "asignatura" }),
      proyecto({ id: "3", name: "Alfa", kind: "asignatura" }),
      proyecto({ id: "4", name: "Antes", archived_at: "2026-10-01T00:00:00Z" }),
    ]);
    expect(lista.map((p) => p.id)).toEqual(["3", "2", "1", "4"]);
  });
});

describe("moverEnLista", () => {
  it("sube y baja un puesto", () => {
    expect(moverEnLista(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moverEnLista(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("en los bordes no cambia nada", () => {
    expect(moverEnLista(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moverEnLista(["a", "b"], "b", 1)).toEqual(["a", "b"]);
    expect(moverEnLista(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });
});

describe("prepararArea", () => {
  it("acepta un área con horas", () => {
    expect(
      prepararArea({ name: " Estudios ", horas: "1,5", personal_time: null }),
    ).toEqual({
      ok: true,
      valor: { name: "Estudios", weekly_minutes: 90, personal_time: false },
    });
  });
  it("las horas son opcionales y el tiempo personal se marca con 'si'", () => {
    expect(
      prepararArea({ name: "Dropshipping", horas: "", personal_time: "si" }),
    ).toEqual({
      ok: true,
      valor: {
        name: "Dropshipping",
        weekly_minutes: null,
        personal_time: true,
      },
    });
  });
  it("rechaza nombre vacío, horas raras o demasiadas horas", () => {
    expect(prepararArea({ name: "", horas: "", personal_time: null }).ok).toBe(
      false,
    );
    expect(
      prepararArea({ name: "A", horas: "muchas", personal_time: null }).ok,
    ).toBe(false);
    expect(
      prepararArea({ name: "A", horas: "200", personal_time: null }).ok,
    ).toBe(false);
  });
});

describe("prepararProyecto", () => {
  it("acepta una asignatura con enlace", () => {
    expect(
      prepararProyecto({
        name: "Asignatura de prueba",
        kind: "asignatura",
        notes: "",
        url: "https://campus.example.com/aula",
      }),
    ).toEqual({
      ok: true,
      valor: {
        name: "Asignatura de prueba",
        kind: "asignatura",
        notes: null,
        url: "https://campus.example.com/aula",
      },
    });
  });
  it("rechaza enlaces que no son http(s) y tipos desconocidos", () => {
    expect(
      prepararProyecto({
        name: "A",
        kind: "proyecto",
        notes: "",
        url: "campus",
      }).ok,
    ).toBe(false);
    expect(
      prepararProyecto({ name: "A", kind: "otro", notes: "", url: "" }).ok,
    ).toBe(false);
  });
});
