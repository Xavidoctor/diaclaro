import { describe, expect, it } from "vitest";
import {
  calcularDia,
  minutosDeAgendaPorDia,
  minutosDeSueno,
  minutosEnCama,
  minutosEnPie,
  minutosUsadosPorDia,
  reparto,
  resumirProgreso,
  type DiaProgreso,
  type HorasDelDia,
} from "./progreso";

// Las horas de estas pruebas son inventadas, solo para comprobar las cuentas.

function horas(cambios: Partial<HorasDelDia>): HorasDelDia {
  return {
    fecha: "2026-10-30",
    despierto: null,
    levantado: null,
    acostarse: null,
    ...cambios,
  };
}

describe("minutosDeSueno", () => {
  it("cuenta desde la noche anterior", () => {
    expect(minutosDeSueno("23:30", "7:30")).toBe(8 * 60);
  });
  it("una hora de madrugada ya es del día nuevo", () => {
    expect(minutosDeSueno("01:00", "8:00")).toBe(7 * 60);
  });
  it("sin hora de acostarte o de despertar, no se sabe", () => {
    expect(minutosDeSueno(null, "8:00")).toBeNull();
    expect(minutosDeSueno("23:00", null)).toBeNull();
  });
  it("si sale algo sin sentido, no se da", () => {
    expect(minutosDeSueno("09:00", "8:00")).toBeNull(); // negativo
    expect(minutosDeSueno("12:00", "11:00")).toBeNull(); // 23 h
  });
});

describe("minutosEnCama", () => {
  it("resta Levantado menos Despierto", () => {
    expect(minutosEnCama("9:50", "10:12")).toBe(22);
  });
  it("sin uno de los dos, nada", () => {
    expect(minutosEnCama("9:50", null)).toBeNull();
  });
  it("Levantado antes que Despierto no tiene sentido", () => {
    expect(minutosEnCama("10:00", "9:00")).toBeNull();
  });
});

describe("minutosEnPie", () => {
  it("de levantarte a acostarte", () => {
    expect(minutosEnPie("8:00", "23:00")).toBe(15 * 60);
  });
  it("acostarte pasada la medianoche cuenta como el día siguiente", () => {
    expect(minutosEnPie("9:00", "01:00")).toBe(16 * 60);
  });
  it("hoy, solo hasta ahora", () => {
    expect(minutosEnPie("8:00", "23:00", "12:30")).toBe(4 * 60 + 30);
  });
  it("hoy pasada la medianoche, sigue contando", () => {
    expect(minutosEnPie("9:00", "02:00", "00:30")).toBe(15 * 60 + 30);
  });
  it("sin hora de acostarte, no se sabe", () => {
    expect(minutosEnPie("8:00", null)).toBeNull();
  });
});

describe("minutosUsadosPorDia", () => {
  it("suma foco, tareas, candidaturas y rutinas por día sin repetir el foco", () => {
    const mapa = minutosUsadosPorDia({
      sesiones: [
        { on_date: "2026-10-27", task_id: "t1", minutes: 30 },
        { on_date: "2026-10-28", task_id: null, minutes: 20 },
      ],
      tareas: [
        // 50 min en total, 30 ya medidos con el temporizador: suma 20.
        { id: "t1", done_at: "2026-10-27T18:00:00Z", actual_minutes: 50 },
        // Las 23:30 UTC del 27 ya son el 28 en Madrid.
        { id: "t2", done_at: "2026-10-27T23:30:00Z", actual_minutes: 10 },
      ],
      focoTotalPorTarea: { t1: 30 },
      candidaturas: [{ on_date: "2026-10-28", minutes: 45 }],
      rutinas: [{ on_date: "2026-10-27", minutes: 15 }],
      zona: "Europe/Madrid",
    });
    expect(mapa.get("2026-10-27")).toBe(30 + 20 + 15);
    expect(mapa.get("2026-10-28")).toBe(20 + 10 + 45);
  });
});

describe("minutosDeAgendaPorDia", () => {
  it("solo cuenta lo que tiene inicio y fin", () => {
    const mapa = minutosDeAgendaPorDia([
      { fecha: "2026-10-27", horaInicio: "16:00", horaFin: "18:00" },
      { fecha: "2026-10-27", horaInicio: "19:00", horaFin: null },
      { fecha: "2026-10-28", horaInicio: null, horaFin: null },
    ]);
    expect(mapa.get("2026-10-27")).toBe(120);
    expect(mapa.has("2026-10-28")).toBe(false);
  });
});

describe("calcularDia", () => {
  it("reparte el día y deja lo que sobra como sin apuntar", () => {
    const dia = calcularDia({
      dia: horas({
        despierto: "7:40",
        levantado: "8:00",
        acostarse: "23:00",
      }),
      anterior: horas({ fecha: "2026-10-29", acostarse: "23:40" }),
      usado: 5 * 60,
      agenda: 2 * 60,
    });
    expect(dia.sueno).toBe(8 * 60);
    expect(dia.enCama).toBe(20);
    expect(dia.enPie).toBe(15 * 60);
    expect(dia.sinApuntar).toBe(8 * 60);
    expect(dia.esHoy).toBe(false);
  });

  it("si solo pulsaste Despierto, el día empieza ahí", () => {
    const dia = calcularDia({
      dia: horas({ despierto: "8:00", acostarse: "22:00" }),
      anterior: null,
      usado: 0,
      agenda: 0,
    });
    expect(dia.sueno).toBeNull(); // no sabemos a qué hora te acostaste
    expect(dia.enPie).toBe(14 * 60);
  });

  it("si has apuntado más de lo que cabe, sin apuntar se queda en 0", () => {
    const dia = calcularDia({
      dia: horas({ levantado: "8:00", acostarse: "10:00" }),
      anterior: null,
      usado: 200,
      agenda: 0,
    });
    expect(dia.sinApuntar).toBe(0);
  });

  it("sin horas, no se inventa nada", () => {
    const dia = calcularDia({
      dia: horas({}),
      anterior: null,
      usado: 30,
      agenda: 0,
    });
    expect(dia.enPie).toBeNull();
    expect(dia.sinApuntar).toBeNull();
    expect(dia.usado).toBe(30);
  });
});

function dia(cambios: Partial<DiaProgreso>): DiaProgreso {
  return {
    fecha: "2026-10-27",
    sueno: null,
    enCama: null,
    enPie: null,
    usado: 0,
    agenda: 0,
    sinApuntar: null,
    esHoy: false,
    ...cambios,
  };
}

describe("resumirProgreso", () => {
  it("hace la media solo con los días que tienen dato", () => {
    const r = resumirProgreso([
      dia({ sueno: 420, enPie: 900, usado: 300, sinApuntar: 600 }),
      dia({ sueno: 480, enPie: 800, usado: 100, sinApuntar: 700 }),
      dia({ usado: 50 }), // sin horas: no cuenta para las medias
    ]);
    expect(r.sueno).toEqual({ total: 900, dias: 2, media: 450 });
    expect(r.usado).toEqual({ total: 400, dias: 2, media: 200 });
    expect(r.sinApuntar.media).toBe(650);
  });

  it("hoy solo cuenta para el sueño", () => {
    const r = resumirProgreso([
      dia({ sueno: 420, enPie: 300, usado: 60, sinApuntar: 240, esHoy: true }),
    ]);
    expect(r.sueno.media).toBe(420);
    expect(r.enPie.media).toBeNull();
    expect(r.usado.dias).toBe(0);
  });
});

describe("reparto", () => {
  it("da los trozos de la barra", () => {
    expect(reparto(dia({ enPie: 600, usado: 300, agenda: 120 }))).toEqual({
      usado: 50,
      agenda: 20,
      sinApuntar: 30,
    });
  });
  it("nunca pasa de 100", () => {
    expect(reparto(dia({ enPie: 100, usado: 90, agenda: 50 }))).toEqual({
      usado: 90,
      agenda: 10,
      sinApuntar: 0,
    });
  });
  it("sin horas, no hay barra", () => {
    expect(reparto(dia({}))).toBeNull();
  });
});
