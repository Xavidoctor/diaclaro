import { describe, expect, it } from "vitest";
import type { Area } from "./areas";
import {
  calcularResumen,
  diaEn,
  porcentaje,
  textoDesglose,
  textoFila,
  type FilaArea,
} from "./resumen-semana";

// Áreas de ejemplo (las horas son inventadas, solo para las pruebas).
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

const estudios = area({ id: "est", name: "Estudios", weekly_minutes: 600 });
const empleo = area({ id: "emp", name: "Empleo", weekly_minutes: 120 });
const hobby = area({
  id: "hob",
  name: "Hobby",
  weekly_minutes: 60,
  personal_time: true,
});

const base = {
  areas: [estudios, empleo, hobby],
  proyectos: [
    { id: "p-est", area_id: "est" },
    { id: "p-hob", area_id: "hob" },
  ],
  sesiones: [],
  tareas: [],
  focoTotalPorTarea: {},
  candidaturas: new Map<string, number>(),
  desde: "2026-10-26",
  hasta: "2026-11-01",
  zona: "Europe/Madrid",
};

describe("diaEn", () => {
  it("usa el día de tu zona horaria", () => {
    expect(diaEn("2026-10-29T23:30:00Z", "Europe/Madrid")).toBe("2026-10-30");
    expect(diaEn("2026-10-29T21:00:00Z", "Europe/Madrid")).toBe("2026-10-29");
  });
});

describe("calcularResumen", () => {
  it("sin nada apuntado, todas las áreas a 0", () => {
    const r = calcularResumen(base);
    expect(r.filas.map((f) => f.total)).toEqual([0, 0, 0]);
    expect(r.total).toBe(0);
  });

  it("suma foco, tareas y candidaturas en su área", () => {
    const r = calcularResumen({
      ...base,
      sesiones: [
        { task_id: "t1", project_id: "p-est", minutes: 50 },
        { task_id: null, project_id: null, minutes: 25 },
      ],
      tareas: [
        {
          id: "t2",
          project_id: "p-est",
          done_at: "2026-10-28T10:00:00Z",
          actual_minutes: 30,
        },
      ],
      candidaturas: new Map([["emp", 45]]),
    });
    const est = r.filas.find((f) => f.area.id === "est")!;
    expect(est).toMatchObject({ foco: 50, tareas: 30, total: 80 });
    expect(r.filas.find((f) => f.area.id === "emp")!.candidaturas).toBe(45);
    expect(r.sinArea).toBe(25);
    expect(r.total).toBe(150);
  });

  it("no cuenta dos veces lo que ya mediste con el temporizador", () => {
    const r = calcularResumen({
      ...base,
      sesiones: [{ task_id: "t1", project_id: "p-est", minutes: 40 }],
      tareas: [
        {
          id: "t1",
          project_id: "p-est",
          done_at: "2026-10-28T10:00:00Z",
          actual_minutes: 50,
        },
      ],
      focoTotalPorTarea: { t1: 40 },
    });
    const est = r.filas.find((f) => f.area.id === "est")!;
    expect(est).toMatchObject({ foco: 40, tareas: 10, total: 50 });
  });

  it("ignora las tareas terminadas fuera de la semana", () => {
    const r = calcularResumen({
      ...base,
      tareas: [
        {
          id: "t1",
          project_id: "p-est",
          // Domingo 25 a las 23:30 en Madrid: es la semana anterior.
          done_at: "2026-10-25T22:30:00Z",
          actual_minutes: 30,
        },
      ],
    });
    expect(r.total).toBe(0);
  });

  it("las tareas sin proyecto cuentan como sin área", () => {
    const r = calcularResumen({
      ...base,
      tareas: [
        {
          id: "t1",
          project_id: null,
          done_at: "2026-10-28T10:00:00Z",
          actual_minutes: 20,
        },
      ],
    });
    expect(r.sinArea).toBe(20);
  });

  it("oculta las áreas archivadas sin tiempo", () => {
    const archivada = area({ id: "arc", archived_at: "2026-10-01T00:00:00Z" });
    const r = calcularResumen({ ...base, areas: [estudios, archivada] });
    expect(r.filas.map((f) => f.area.id)).toEqual(["est"]);
  });

  it("marca el estado de cada área", () => {
    const r = calcularResumen({
      ...base,
      sesiones: [
        { task_id: "t", project_id: "p-est", minutes: 600 },
        { task_id: "h", project_id: "p-hob", minutes: 90 },
      ],
    });
    const estado = Object.fromEntries(
      r.filas.map((f) => [f.area.id, f.estado]),
    );
    expect(estado).toEqual({
      est: "cumplido",
      emp: "pendiente",
      hob: "pasado",
    });
  });
});

function fila(cambios: Partial<FilaArea>, a: Area = estudios): FilaArea {
  return {
    area: a,
    foco: 0,
    tareas: 0,
    candidaturas: 0,
    total: 0,
    estado: "pendiente",
    ...cambios,
  };
}

describe("textos", () => {
  it("dice cuánto falta", () => {
    expect(textoFila(fila({ total: 90 }))).toBe(
      "1 h 30 min de 10 h: faltan 8 h 30 min",
    );
  });

  it("celebra cuando llegas", () => {
    expect(textoFila(fila({ total: 660, estado: "cumplido" }))).toBe(
      "11 h de 10 h: hecho, y 1 h de más",
    );
  });

  it("avisa si pasas el tope del tiempo personal", () => {
    expect(textoFila(fila({ total: 90, estado: "pasado" }, hobby))).toBe(
      "1 h 30 min de un tope de 1 h: te has pasado 30 min",
    );
  });

  it("sin horas fijadas no compara", () => {
    const libre = area({ name: "Libre" });
    expect(textoFila(fila({ estado: "sin-presupuesto" }, libre))).toBe(
      "Nada apuntado (sin horas fijadas)",
    );
  });

  it("desglosa solo lo que tiene minutos", () => {
    expect(textoDesglose({ foco: 60, tareas: 0, candidaturas: 45 })).toBe(
      "Foco 1 h · Candidaturas 45 min",
    );
    expect(textoDesglose({ foco: 0, tareas: 0, candidaturas: 0 })).toBeNull();
  });

  it("la barra no pasa del 100 %", () => {
    expect(porcentaje(30, 120)).toBe(25);
    expect(porcentaje(300, 120)).toBe(100);
    expect(porcentaje(30, null)).toBe(0);
  });
});
