import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import { horasDelDia, minutosOcupados } from "./horas-del-dia";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
function cosa(
  horaInicio: string | null,
  horaFin: string | null,
  extra: Partial<Ocurrencia> = {},
): Ocurrencia {
  return {
    eventoId: `${horaInicio}-${horaFin}`,
    titulo: "Algo",
    fecha: "2026-10-31",
    fechaOriginal: "2026-10-31",
    horaInicio,
    horaFin,
    franja: null,
    seRepite: false,
    cambiada: false,
    ...extra,
  };
}

describe("horasDelDia", () => {
  it("otro día: 24 h menos 9 de dormir son 15 h", () => {
    const h = horasDelDia({
      ahora: null,
      despertar: "9:00",
      acostarse: "23:00",
      ocupado: 300,
    });
    expect(h.total).toBe(15 * 60);
    expect(h.quedan).toBe(15 * 60);
    expect(h.libre).toBe(10 * 60);
    expect(h.lleno).toBe(false);
  });

  it("hoy: desde que te despiertas hasta acostarte, menos lo que ha pasado", () => {
    const h = horasDelDia({
      ahora: "14:00",
      despertar: "9:00",
      acostarse: "23:00",
      ocupado: 120,
    });
    expect(h.total).toBe(14 * 60);
    expect(h.pasado).toBe(5 * 60);
    expect(h.quedan).toBe(9 * 60);
    expect(h.libre).toBe(7 * 60);
  });

  it("a las 16:00 quedan 2 h menos que a las 14:00", () => {
    const base = { despertar: "9:00", acostarse: "23:00", ocupado: 0 };
    const a = horasDelDia({ ...base, ahora: "14:00" });
    const b = horasDelDia({ ...base, ahora: "16:00" });
    expect(a.quedan - b.quedan).toBe(120);
  });

  it("sin hora de acostarte, usa las 15 h desde que te despiertas", () => {
    const h = horasDelDia({
      ahora: "10:00",
      despertar: "8:00",
      acostarse: null,
      ocupado: 0,
    });
    expect(h.total).toBe(15 * 60);
    expect(h.quedan).toBe(13 * 60);
    expect(h.calculadoConSueno).toBe(true);
  });

  it("acostarse pasada la medianoche cuenta como la noche de hoy", () => {
    const h = horasDelDia({
      ahora: "00:30",
      despertar: "10:00",
      acostarse: "01:00",
      ocupado: 0,
    });
    expect(h.total).toBe(15 * 60);
    expect(h.quedan).toBe(30);
  });

  it("avisa cuando más del 80 % de lo que queda está ocupado", () => {
    const base = { ahora: "13:00", despertar: "9:00", acostarse: "23:00" };
    expect(horasDelDia({ ...base, ocupado: 480 }).lleno).toBe(true);
    expect(horasDelDia({ ...base, ocupado: 400 }).lleno).toBe(false);
  });

  it("si hay más ocupado que tiempo, dice cuánto te pasas", () => {
    const h = horasDelDia({
      ahora: "20:00",
      despertar: "9:00",
      acostarse: "23:00",
      ocupado: 240,
    });
    expect(h.libre).toBe(0);
    expect(h.exceso).toBe(60);
  });

  it("acepta otras horas de dormir", () => {
    const h = horasDelDia({
      ahora: null,
      despertar: null,
      acostarse: null,
      ocupado: 0,
      horasSueno: 8,
    });
    expect(h.total).toBe(16 * 60);
  });
});

describe("minutosOcupados", () => {
  it("suma lo que tiene inicio y fin, sin contar dos veces lo que se junta", () => {
    const lista = [
      cosa("9:00", "11:00"),
      cosa("10:00", "12:00"),
      cosa("15:00", "15:30"),
    ];
    expect(minutosOcupados(lista, null)).toBe(180 + 30);
  });

  it("no cuenta lo hecho, lo sin fin ni lo de Google «Disponible»", () => {
    const lista = [
      cosa("9:00", "10:00", {
        bloque: { tipo: "rutina", id: "r", hecha: true },
      } as Partial<Ocurrencia>),
      cosa("11:00", null),
      cosa("12:00", "13:00", {
        google: { libre: true },
      } as Partial<Ocurrencia>),
    ];
    expect(minutosOcupados(lista, null)).toBe(0);
  });

  it("hoy solo cuenta lo que queda desde ahora", () => {
    const lista = [cosa("9:00", "11:00"), cosa("16:00", "17:00")];
    expect(minutosOcupados(lista, "10:00")).toBe(60 + 60);
  });

  it("suma las tareas sin hora que tienen minutos", () => {
    expect(minutosOcupados([cosa("9:00", "10:00")], null, 45)).toBe(105);
  });
});
