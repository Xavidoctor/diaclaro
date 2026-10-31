import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import {
  aHora,
  durmioPoco,
  huecosLibres,
  leerBloquesAceptados,
  organizarDia,
} from "./organizar";
import type { TareaParaPlan } from "./plan";

const hoy = "2026-10-31";

function tarea(cambios: Partial<TareaParaPlan>): TareaParaPlan {
  return {
    id: cambios.title ?? "t",
    title: "Tarea",
    kind: "tarea",
    due_date: hoy,
    estimated_minutes: 60,
    importance: null,
    hard_deadline: false,
    created_at: "2026-10-01T10:00:00Z",
    tiempoPersonal: false,
    ...cambios,
  };
}

function cita(inicio: string, fin: string | null, titulo = "Cita"): Ocurrencia {
  return {
    eventoId: titulo,
    titulo,
    fecha: hoy,
    fechaOriginal: hoy,
    horaInicio: inicio,
    horaFin: fin,
    franja: null,
    seRepite: false,
    cambiada: false,
  };
}

describe("huecosLibres", () => {
  it("quita lo ocupado y deja 10 minutos de respiro después", () => {
    expect(
      huecosLibres({
        ahora: "09:00",
        levantarse: "10:00",
        acostarse: "23:00",
        ocupado: [{ inicio: "12:00", fin: "13:00" }],
      }),
    ).toEqual([
      { inicio: 600, fin: 720 },
      { inicio: 790, fin: 1380 },
    ]);
  });

  it("empieza ahora (redondeado a 5 min) si ya te has levantado", () => {
    const [h] = huecosLibres({
      ahora: "16:02",
      levantarse: "10:00",
      acostarse: "23:00",
      ocupado: [],
    });
    expect(h.inicio).toBe(16 * 60 + 5);
  });

  it("si te acuestas pasada la medianoche, el día se alarga", () => {
    expect(
      huecosLibres({
        ahora: "22:00",
        levantarse: "10:00",
        acostarse: "01:00",
        ocupado: [{ inicio: "00:00", fin: "00:30" }],
      }),
    ).toEqual([
      { inicio: 1320, fin: 1440 },
      { inicio: 1480, fin: 1500 },
    ]);
  });

  it("lo que no tiene hora de fin corta el hueco en su inicio", () => {
    expect(
      huecosLibres({
        ahora: "10:00",
        levantarse: "10:00",
        acostarse: "14:00",
        ocupado: [{ inicio: "12:00", fin: null }],
      }),
    ).toEqual([
      { inicio: 600, fin: 720 },
      { inicio: 720, fin: 840 },
    ]);
  });

  it("si ya es hora de dormir, no hay huecos", () => {
    expect(
      huecosLibres({
        ahora: "23:30",
        levantarse: "10:00",
        acostarse: "23:00",
        ocupado: [],
      }),
    ).toEqual([]);
  });
});

describe("organizarDia", () => {
  const base = {
    hoy,
    ahora: "10:00",
    levantarse: "10:00",
    acostarse: "22:00",
    agenda: [] as Ocurrencia[],
    factores: {},
  };

  it("coloca la principal y 2 más, con respiro entre ellas", () => {
    const r = organizarDia({
      ...base,
      tareas: [
        tarea({ title: "C", estimated_minutes: 30 }),
        tarea({ title: "A", importance: "alta", estimated_minutes: 60 }),
        tarea({ title: "B", estimated_minutes: 45 }),
        tarea({ title: "D", importance: "baja" }),
      ],
    });
    expect(r.bloques.map((b) => [b.tarea.title, b.inicio, b.fin])).toEqual([
      ["A", "10:00", "11:00"],
      ["C", "11:10", "11:40"],
      ["B", "11:50", "12:35"],
    ]);
  });

  it("usa lo que sueles tardar de verdad", () => {
    const r = organizarDia({
      ...base,
      tareas: [tarea({ estimated_minutes: 60 })],
      factores: { tarea: { factor: 1.5, muestras: 8 } },
    });
    expect(r.bloques[0]).toMatchObject({
      minutos: 90,
      previstos: 60,
      fin: "11:30",
    });
  });

  it("no inventa duraciones: las tareas sin minutos se quedan fuera", () => {
    const r = organizarDia({
      ...base,
      tareas: [tarea({ title: "Sin", estimated_minutes: null })],
    });
    expect(r.bloques).toEqual([]);
    expect(r.sinMinutos.map((t) => t.title)).toEqual(["Sin"]);
  });

  it("salta lo ocupado de la agenda y no usa lo «Disponible» de Google", () => {
    const libreEnGoogle = {
      ...cita("10:00", "18:00", "Libre"),
      google: { libre: true },
    };
    const r = organizarDia({
      ...base,
      tareas: [tarea({ estimated_minutes: 60 })],
      agenda: [cita("10:00", "11:30", "Clase"), libreEnGoogle],
    });
    expect(r.bloques[0].inicio).toBe("11:40");
  });

  it("nunca llena más del 70 % del tiempo libre", () => {
    // De 10:00 a 13:00 hay 180 min libres: caben 126 como mucho.
    const r = organizarDia({
      ...base,
      acostarse: "13:00",
      tareas: [
        tarea({ title: "A", importance: "alta", estimated_minutes: 90 }),
        tarea({ title: "B", estimated_minutes: 60 }),
      ],
    });
    expect(r.bloques.map((b) => b.tarea.title)).toEqual(["A"]);
    expect(r.noCaben.map((t) => t.title)).toEqual(["B"]);
  });

  it("en un día ligero solo coloca la principal", () => {
    const r = organizarDia({
      ...base,
      ligero: true,
      tareas: [tarea({ title: "A" }), tarea({ title: "B" })],
    });
    expect(r.bloques).toHaveLength(1);
  });

  it("avisa de los compromisos sin hora de fin", () => {
    const r = organizarDia({
      ...base,
      tareas: [],
      agenda: [cita("17:00", null, "Tutoría")],
    });
    expect(r.sinFin).toEqual(["Tutoría"]);
  });
});

describe("aHora y durmioPoco", () => {
  it("pasa minutos a hora, también pasada la medianoche", () => {
    expect(aHora(630)).toBe("10:30");
    expect(aHora(1500)).toBe("01:00");
  });

  it("menos de 6 horas es dormir poco", () => {
    expect(durmioPoco(5 * 60)).toBe(true);
    expect(durmioPoco(7 * 60)).toBe(false);
    expect(durmioPoco(null)).toBe(false);
  });
});

describe("leerBloquesAceptados", () => {
  it("solo acepta id y hora válidos", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      leerBloquesAceptados([`${id}|10:30`, "otro|10:00", `${id}|25:00`, 3]),
    ).toEqual([{ id, hora: "10:30" }]);
  });
});
