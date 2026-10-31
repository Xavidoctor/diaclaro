import { describe, expect, it } from "vitest";
import { bloquesDeRutinas, bloquesDeTareas, textoHoraTarea } from "./bloques";
import type { Rutina } from "./rutinas";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
const tarea = {
  id: "t1",
  title: "Reunión",
  due_date: "2026-11-03",
  due_time: "10:00",
  estimated_minutes: 90,
  done_at: null,
};

const clase: Rutina = {
  id: "r1",
  title: "Clase",
  notes: null,
  repeat_rule: "FREQ=WEEKLY;BYDAY=MO,WE", // lunes y miércoles
  times_per_day: 1,
  duration_minutes: null,
  window_start: "16:00",
  window_end: "18:00",
  times_of_day: null,
  part_of_day: null,
  focus: false,
  focus_alarm_minutes: null,
  active: true,
  project_id: "p1",
};

describe("textoHoraTarea", () => {
  it("da el rato completo si hay minutos", () => {
    expect(textoHoraTarea(tarea)).toBe("10:00–11:30");
    expect(textoHoraTarea({ ...tarea, estimated_minutes: null })).toBe("10:00");
    expect(textoHoraTarea({ ...tarea, due_time: null })).toBeNull();
  });
});

describe("bloquesDeTareas", () => {
  it("solo saca las tareas con día y hora dentro de las fechas", () => {
    const bloques = bloquesDeTareas(
      [
        tarea,
        { ...tarea, id: "sin-hora", due_time: null },
        { ...tarea, id: "otro-mes", due_date: "2026-12-01" },
      ],
      "2026-11-01",
      "2026-11-07",
    );
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatchObject({
      fecha: "2026-11-03",
      horaInicio: "10:00",
      horaFin: "11:30",
      bloque: { tipo: "tarea", id: "t1", hecha: false },
    });
  });
});

describe("bloquesDeRutinas", () => {
  it("pone la clase solo los días que toca, con su Desde–Hasta", () => {
    // Del lunes 2 al domingo 8 de noviembre de 2026.
    const bloques = bloquesDeRutinas([clase], "2026-11-02", "2026-11-08");
    expect(bloques.map((b) => b.fecha)).toEqual(["2026-11-02", "2026-11-04"]);
    expect(bloques[0]).toMatchObject({
      horaInicio: "16:00",
      horaFin: "18:00",
      seRepite: true,
      bloque: { tipo: "rutina", id: "r1" },
    });
  });

  it("sin «Hasta», el fin sale de los minutos; sin minutos, no hay fin", () => {
    const [con] = bloquesDeRutinas(
      [{ ...clase, window_end: null, duration_minutes: 45 }],
      "2026-11-02",
      "2026-11-02",
    );
    expect(con.horaFin).toBe("16:45");
    const [sin] = bloquesDeRutinas(
      [{ ...clase, window_end: null }],
      "2026-11-02",
      "2026-11-02",
    );
    expect(sin.horaFin).toBeNull();
  });

  it("una rutina de varias veces da un bloque por cada vez con hora", () => {
    const bloques = bloquesDeRutinas(
      [
        {
          ...clase,
          repeat_rule: null,
          times_per_day: 3,
          times_of_day: ["09:00", null, "20:00"],
          duration_minutes: 30,
        },
      ],
      "2026-11-02",
      "2026-11-02",
    );
    expect(bloques.map((b) => [b.horaInicio, b.horaFin])).toEqual([
      ["09:00", "09:30"],
      ["20:00", "20:30"],
    ]);
  });

  it("no saca las rutinas sin hora ni las que están en pausa", () => {
    expect(
      bloquesDeRutinas(
        [
          { ...clase, window_start: null, window_end: null },
          { ...clase, active: false },
        ],
        "2026-11-02",
        "2026-11-08",
      ),
    ).toEqual([]);
  });
});

describe("rutinas movidas de hora un día", () => {
  const paseo: Rutina = {
    ...clase,
    id: "r2",
    title: "Paseo",
    project_id: null,
  };

  it("ese día sale a la hora nueva y marcada como cambiada", () => {
    const [b] = bloquesDeRutinas([paseo], "2026-11-02", "2026-11-02", [
      { routine_id: "r2", on_date: "2026-11-02", slot: 1, start_time: "19:00" },
    ]);
    expect([b.horaInicio, b.horaFin, b.cambiada]).toEqual([
      "19:00",
      "21:00",
      true,
    ]);
    expect(b.bloque).toMatchObject({ vez: 1, fija: false });
  });

  it("una rutina dentro de un proyecto (una clase) es fija", () => {
    const [b] = bloquesDeRutinas([clase], "2026-11-02", "2026-11-02");
    expect(b.bloque?.fija).toBe(true);
    expect(b.cambiada).toBe(false);
  });
});
