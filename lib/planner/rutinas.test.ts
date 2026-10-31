import { describe, expect, it } from "vitest";
import { prepararAjustes, esZonaValida } from "./ajustes";
import {
  filasDeHoy,
  prepararRutina,
  rutinasDelDia,
  vecesDeRutina,
  textoFranja,
  textoVeces,
  tocaRutina,
  type Rutina,
} from "./rutinas";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
const paseo: Rutina = {
  id: "p1",
  title: "Paseo del perro",
  notes: null,
  repeat_rule: null,
  times_per_day: 3,
  duration_minutes: 15,
  window_start: null,
  window_end: null,
  times_of_day: null,
  part_of_day: null,
  focus: false,
  focus_alarm_minutes: null,
  active: true,
};

const formulario = {
  title: "Paseo del perro",
  notes: "",
  cuando: "todos",
  dias: [],
  times_per_day: "3",
  duration_minutes: "15",
  window_start: "",
  window_end: "",
  part_of_day: "",
};

describe("tocaRutina", () => {
  it("sin regla, toca todos los días", () => {
    expect(tocaRutina(paseo, "2026-10-30")).toBe(true);
  });

  it("con días de la semana, solo esos días", () => {
    const findes = { repeat_rule: "FREQ=WEEKLY;BYDAY=SA,SU" };
    expect(tocaRutina(findes, "2026-10-31")).toBe(true); // sábado
    expect(tocaRutina(findes, "2026-10-30")).toBe(false); // viernes
  });
});

describe("rutinasDelDia", () => {
  it("cuenta las veces hechas ese día y solo ese día", () => {
    const registros = [
      { routine_id: "p1", on_date: "2026-10-30" },
      { routine_id: "p1", on_date: "2026-10-30" },
      { routine_id: "p1", on_date: "2026-10-29" },
    ];
    expect(rutinasDelDia([paseo], registros, "2026-10-30")).toEqual([
      {
        rutina: paseo,
        hechas: 2,
        completa: false,
        veces: [
          { numero: 1, hora: null, hecha: true },
          { numero: 2, hora: null, hecha: true },
          { numero: 3, hora: null, hecha: false },
        ],
      },
    ]);
  });

  it("marca como completa cuando llegas a las veces del día", () => {
    const registros = Array(3).fill({
      routine_id: "p1",
      on_date: "2026-10-30",
    });
    expect(rutinasDelDia([paseo], registros, "2026-10-30")[0].completa).toBe(
      true,
    );
  });

  it("no enseña las pausadas ni las que no tocan", () => {
    const pausada = { ...paseo, id: "x", active: false };
    const sabados = { ...paseo, id: "s", repeat_rule: "FREQ=WEEKLY;BYDAY=SA" };
    expect(
      rutinasDelDia([pausada, sabados], [], "2026-10-30").map(
        (r) => r.rutina.id,
      ),
    ).toEqual([]);
  });

  it("pone primero las pendientes y luego por franja", () => {
    const manana = {
      ...paseo,
      id: "m",
      title: "Mañana",
      times_per_day: 1,
      part_of_day: "mañana" as const,
    };
    const tarde = {
      ...paseo,
      id: "t",
      title: "Tarde",
      times_per_day: 1,
      part_of_day: "tarde" as const,
    };
    const hecha = {
      ...paseo,
      id: "h",
      title: "Hecha",
      times_per_day: 1,
      window_start: "08:00",
    };
    const registros = [{ routine_id: "h", on_date: "2026-10-30" }];
    expect(
      rutinasDelDia([tarde, hecha, manana], registros, "2026-10-30").map(
        (r) => r.rutina.title,
      ),
    ).toEqual(["Mañana", "Tarde", "Hecha"]);
  });
});

describe("vecesDeRutina", () => {
  const dos = { ...paseo, times_per_day: 2, times_of_day: ["09:15", "19:00"] };

  it("marca cada vez por separado", () => {
    const registros = [{ routine_id: "p1", on_date: "2026-10-30", slot: 2 }];
    expect(vecesDeRutina(dos, registros, "2026-10-30")).toEqual([
      { numero: 1, hora: "09:15", hecha: false },
      { numero: 2, hora: "19:00", hecha: true },
    ]);
  });

  it("lo apuntado sin vez rellena la primera que queda", () => {
    const registros = [
      { routine_id: "p1", on_date: "2026-10-30", slot: 1 },
      { routine_id: "p1", on_date: "2026-10-30", slot: null },
    ];
    expect(
      vecesDeRutina(dos, registros, "2026-10-30").map((v) => v.hecha),
    ).toEqual([true, true]);
  });

  it("no cuenta otros días", () => {
    const registros = [{ routine_id: "p1", on_date: "2026-10-29", slot: 1 }];
    expect(
      vecesDeRutina(dos, registros, "2026-10-30").map((v) => v.hecha),
    ).toEqual([false, false]);
  });
});

describe("filasDeHoy", () => {
  it("una fila por vez, primero lo pendiente y por hora", () => {
    const perro = {
      ...paseo,
      id: "perro",
      title: "Perro",
      times_per_day: 2,
      times_of_day: ["09:15", "19:00"],
      window_start: "09:15",
    };
    const leer = {
      ...paseo,
      id: "leer",
      title: "Leer",
      times_per_day: 1,
      window_start: "12:00",
    };
    const registros = [{ routine_id: "perro", on_date: "2026-10-30", slot: 1 }];
    const filas = filasDeHoy(
      rutinasDelDia([perro, leer], registros, "2026-10-30"),
    );
    expect(
      filas.map((f) => [f.item.rutina.title, f.vez?.numero ?? null, f.hecha]),
    ).toEqual([
      ["Leer", null, false],
      ["Perro", 2, false],
      ["Perro", 1, true],
    ]);
  });
});

describe("textos", () => {
  it("describe la franja", () => {
    expect(
      textoFranja({
        window_start: "10:00",
        window_end: "13:00",
        part_of_day: null,
      }),
    ).toBe("Entre 10:00 y 13:00");
    expect(
      textoFranja({
        window_start: null,
        window_end: null,
        part_of_day: "mañana",
      }),
    ).toBe("Por la mañana");
    expect(
      textoFranja({ window_start: null, window_end: null, part_of_day: null }),
    ).toBe("Cuando puedas");
    expect(
      textoFranja({
        window_start: "09:15",
        window_end: null,
        part_of_day: null,
        times_of_day: ["09:15", null, "19:00"],
      }),
    ).toBe("A las 09:15 y 19:00");
  });

  it("describe las veces y los minutos", () => {
    expect(textoVeces(paseo)).toBe("3 veces · 15 min");
    expect(textoVeces({ times_per_day: 1, duration_minutes: null })).toBe(
      "1 vez",
    );
  });
});

describe("prepararRutina", () => {
  it("acepta una rutina de todos los días sin franja", () => {
    expect(prepararRutina(formulario)).toEqual({
      ok: true,
      valor: {
        title: "Paseo del perro",
        notes: null,
        repeat_rule: null,
        times_per_day: 3,
        duration_minutes: 15,
        window_start: null,
        window_end: null,
        times_of_day: null,
        part_of_day: null,
        focus: false,
        focus_alarm_minutes: null,
      },
    });
  });

  it("guarda una hora para cada vez, y la primera como inicio", () => {
    const r = prepararRutina({
      ...formulario,
      times_per_day: "2",
      horas: ["09:15", "19:00"],
      part_of_day: "mañana",
    });
    expect(r).toMatchObject({
      ok: true,
      valor: {
        times_of_day: ["09:15", "19:00"],
        window_start: "09:15",
        window_end: null,
        part_of_day: null,
      },
    });
  });

  it("deja sin hora las veces que no rellenas", () => {
    const r = prepararRutina({
      ...formulario,
      horas: ["", "19:00"],
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { times_of_day: [null, "19:00", null], window_start: "19:00" },
    });
  });

  it("sin ninguna hora por vez, no guarda horas", () => {
    const r = prepararRutina({ ...formulario, horas: ["", ""] });
    expect(r).toMatchObject({ ok: true, valor: { times_of_day: null } });
  });

  it("con 1 vez al día no usa las horas por vez", () => {
    const r = prepararRutina({
      ...formulario,
      times_per_day: "1",
      window_start: "10:00",
      horas: ["09:15"],
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { times_of_day: null, window_start: "10:00" },
    });
  });

  it("rechaza una hora por vez mal escrita", () => {
    expect(prepararRutina({ ...formulario, horas: ["9h"] }).ok).toBe(false);
  });

  it("el aviso del foco vale con la hora de la 1.ª vez", () => {
    const r = prepararRutina({
      ...formulario,
      horas: ["16:00"],
      focus: "si",
      focus_alarm_minutes: "10",
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { focus_alarm_minutes: 10, window_start: "16:00" },
    });
  });

  it("guarda el modo foco con su aviso antes de empezar", () => {
    const r = prepararRutina({
      ...formulario,
      window_start: "16:00",
      focus: "si",
      focus_alarm_minutes: "10",
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { focus: true, focus_alarm_minutes: 10, window_start: "16:00" },
    });
  });

  it("el aviso antes de empezar necesita la hora de inicio", () => {
    expect(
      prepararRutina({ ...formulario, focus: "si", focus_alarm_minutes: "10" }),
    ).toEqual({
      ok: false,
      error:
        "Para avisarte antes de empezar, pon a qué hora empieza (en «Desde»).",
    });
  });

  it("sin foco no hay aviso, aunque llegue uno", () => {
    const r = prepararRutina({
      ...formulario,
      window_start: "16:00",
      focus_alarm_minutes: "10",
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { focus: false, focus_alarm_minutes: null },
    });
  });

  it("deja vacíos los minutos si no los pones", () => {
    const r = prepararRutina({ ...formulario, duration_minutes: "" });
    expect(r).toMatchObject({ ok: true, valor: { duration_minutes: null } });
  });

  it("guarda algunos días con la regla estándar", () => {
    const r = prepararRutina({
      ...formulario,
      cuando: "algunos",
      dias: ["SU", "SA"],
    });
    expect(r).toMatchObject({
      ok: true,
      valor: { repeat_rule: "FREQ=WEEKLY;BYDAY=SA,SU" },
    });
  });

  it("pide los días si eliges algunos días", () => {
    expect(prepararRutina({ ...formulario, cuando: "algunos" })).toEqual({
      ok: false,
      error: "Marca qué días toca.",
    });
  });

  it("revisa la franja", () => {
    expect(
      prepararRutina({
        ...formulario,
        window_start: "13:00",
        window_end: "10:00",
      }).ok,
    ).toBe(false);
  });

  it("revisa las veces al día", () => {
    expect(prepararRutina({ ...formulario, times_per_day: "0" }).ok).toBe(
      false,
    );
    expect(prepararRutina({ ...formulario, times_per_day: "dos" }).ok).toBe(
      false,
    );
  });
});

describe("prepararAjustes", () => {
  const vacio = {
    timezone: "Europe/Madrid",
    wake_time: "",
    sleep_time: "",
    lunch_time: "",
    dinner_time: "",
  };

  it("todo vacío menos la zona: no se inventa ninguna hora", () => {
    expect(prepararAjustes(vacio)).toEqual({
      ok: true,
      valor: {
        timezone: "Europe/Madrid",
        wake_time: null,
        sleep_time: null,
        lunch_time: null,
        dinner_time: null,
      },
    });
  });

  it("guarda las horas que pongas", () => {
    const r = prepararAjustes({ ...vacio, wake_time: "10:00" });
    expect(r).toMatchObject({ ok: true, valor: { wake_time: "10:00" } });
  });

  it("rechaza una zona horaria que no existe", () => {
    expect(esZonaValida("Europe/Madrid")).toBe(true);
    expect(prepararAjustes({ ...vacio, timezone: "Marte/Olympus" })).toEqual({
      ok: false,
      error: "Esa zona horaria no existe.",
    });
  });
});
