import { describe, expect, it } from "vitest";
import { prepararAjustes, esZonaValida } from "./ajustes";
import {
  prepararRutina,
  rutinasDelDia,
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
  part_of_day: null,
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
      { rutina: paseo, hechas: 2, completa: false },
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
        part_of_day: null,
      },
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
