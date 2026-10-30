import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import {
  calcularCarga,
  minutosLibres,
  textoDuracion,
  type EntradaCarga,
} from "./carga";
import { horaEn } from "./fechas";
import type { Rutina, RutinaDelDia } from "./rutinas";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
function evento(
  titulo: string,
  horaInicio: string | null,
  horaFin: string | null,
): Ocurrencia {
  return {
    eventoId: titulo,
    titulo,
    fecha: "2026-10-30",
    fechaOriginal: "2026-10-30",
    horaInicio,
    horaFin,
    franja: null,
    seRepite: false,
    cambiada: false,
  };
}

function rutina(
  title: string,
  veces: number,
  minutos: number | null,
  hechas = 0,
): RutinaDelDia {
  const r: Rutina = {
    id: title,
    title,
    notes: null,
    repeat_rule: null,
    times_per_day: veces,
    duration_minutes: minutos,
    window_start: null,
    window_end: null,
    part_of_day: null,
    focus: false,
    focus_alarm_minutes: null,
    active: true,
  };
  return { rutina: r, hechas, completa: hechas >= veces };
}

const base: EntradaCarga = {
  ahora: "16:00",
  horaLevantarse: "08:00",
  horaAcostarse: "23:00",
  tareas: [],
  agenda: [],
  rutinas: [],
};

describe("minutosLibres", () => {
  it("cuenta desde ahora hasta la hora de acostarte", () => {
    expect(minutosLibres("16:00", "08:00", "23:00")).toBe(7 * 60);
  });

  it("si aún no te has levantado, empieza a tu hora de levantarte", () => {
    expect(minutosLibres("06:00", "08:00", "23:00")).toBe(15 * 60);
  });

  it("entiende acostarse pasada la medianoche", () => {
    expect(minutosLibres("22:00", "10:00", "01:00")).toBe(3 * 60);
    expect(minutosLibres("00:30", "10:00", "01:00")).toBe(30);
  });

  it("sin hora de levantarte también entiende la medianoche", () => {
    expect(minutosLibres("22:00", null, "01:00")).toBe(3 * 60);
    expect(minutosLibres("22:00", null, "23:00")).toBe(60);
  });

  it("nunca da tiempo negativo", () => {
    expect(minutosLibres("23:30", "08:00", "23:00")).toBe(0);
  });
});

describe("calcularCarga", () => {
  it("sin hora de acostarte no calcula nada", () => {
    expect(calcularCarga({ ...base, horaAcostarse: null })).toEqual({
      estado: "falta-hora-acostarse",
    });
  });

  it("dice que cabe cuando sobra tiempo", () => {
    const carga = calcularCarga({
      ...base,
      tareas: [
        { title: "Repasar tema 1", kind: "tarea", estimated_minutes: 60 },
      ],
    });
    expect(carga).toMatchObject({
      estado: "cabe",
      apuntado: 60,
      libre: 420,
      diferencia: 360,
    });
  });

  it("avisa cuando te pasas y dice cuánto", () => {
    const carga = calcularCarga({
      ...base,
      ahora: "20:00",
      tareas: [{ title: "Entrega", kind: "tarea", estimated_minutes: 150 }],
      agenda: [evento("Clase", "21:00", "22:00")],
      rutinas: [rutina("Paseo", 1, 15)],
    });
    expect(carga).toMatchObject({
      estado: "te-pasas",
      apuntado: 225,
      libre: 180,
      diferencia: -45,
    });
  });

  it("no se inventa minutos: los guarda aparte", () => {
    const carga = calcularCarga({
      ...base,
      tareas: [
        { title: "Llamar al banco", kind: "tarea", estimated_minutes: null },
      ],
      agenda: [evento("Tutoría", null, null)],
      rutinas: [rutina("Leer", 1, null)],
    });
    expect(carga).toMatchObject({
      apuntado: 0,
      sinDuracion: ["Llamar al banco", "Tutoría", "Leer"],
    });
  });

  it("corrige las tareas con lo que sueles tardar", () => {
    const carga = calcularCarga({
      ...base,
      tareas: [
        { title: "Repasar", kind: "tarea", estimated_minutes: 60 },
        { title: "Entrega", kind: "entrega", estimated_minutes: 60 },
      ],
      factores: { tarea: { factor: 1.5, muestras: 5 } },
    });
    expect(carga).toMatchObject({ apuntado: 90 + 60, ajuste: 30 });
  });

  it("de la agenda solo cuenta lo que queda", () => {
    const carga = calcularCarga({
      ...base,
      agenda: [
        evento("Ya pasó", "10:00", "11:00"),
        evento("A medias", "15:30", "17:00"),
        evento("Luego", "18:00", "19:30"),
        evento("Empezó sin fin", "12:00", null),
      ],
    });
    expect(carga).toMatchObject({ apuntado: 60 + 90, sinDuracion: [] });
  });

  it("de Google cuenta lo ocupado, no lo «Disponible» ni lo de todo el día", () => {
    const deGoogle = (o: Ocurrencia, libre: boolean): Ocurrencia => ({
      ...o,
      google: { libre },
    });
    const carga = calcularCarga({
      ...base,
      agenda: [
        deGoogle(evento("Reunión", "17:00", "18:00"), false),
        deGoogle(evento("Comer con Ana", "18:00", "19:00"), true),
        deGoogle(evento("Festivo", null, null), false),
      ],
    });
    expect(carga).toMatchObject({ apuntado: 60, sinDuracion: [] });
  });

  it("de las rutinas solo cuenta las veces que faltan", () => {
    const carga = calcularCarga({
      ...base,
      rutinas: [rutina("Paseo", 3, 15, 1), rutina("Estirar", 1, 10, 1)],
    });
    expect(carga).toMatchObject({ apuntado: 30 });
  });
});

describe("textoDuracion", () => {
  it("escribe horas y minutos", () => {
    expect(textoDuracion(150)).toBe("2 h 30 min");
    expect(textoDuracion(45)).toBe("45 min");
    expect(textoDuracion(120)).toBe("2 h");
    expect(textoDuracion(-30)).toBe("30 min");
  });
});

describe("horaEn", () => {
  it("da la hora en la zona pedida, no en la del servidor", () => {
    const momento = new Date("2026-10-30T15:05:00Z");
    expect(horaEn("Europe/Madrid", momento)).toBe("16:05");
    expect(horaEn("Atlantic/Canary", momento)).toBe("15:05");
  });
});
