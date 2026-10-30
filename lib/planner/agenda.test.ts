import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  crearRegla,
  describirRepeticion,
  fechasDelEvento,
  leerFechaParam,
  leerRegla,
  ocurrenciasEntre,
  prepararCambioDia,
  prepararEvento,
  textoHora,
  type Evento,
  type Excepcion,
} from "./agenda";
import { diasDesde, esFecha, hoyEn, nombreDia, sumarDias } from "./fechas";

// Un evento de ejemplo: lunes, martes y miércoles por la tarde, sin hora exacta.
// (Las fechas de las pruebas son inventadas; no son los horarios reales de nadie).
const tutoria: Evento = {
  id: "t1",
  title: "Tutoría",
  notes: null,
  start_date: "2026-10-26", // lunes
  start_time: null,
  end_time: null,
  part_of_day: "tarde",
  repeat_rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE",
};

const formulario = {
  title: "Tutoría",
  notes: "",
  start_date: "2026-10-26",
  start_time: "",
  end_time: "",
  part_of_day: "tarde",
  repetir: "semanal",
  dias: ["MO", "TU", "WE"],
  hasta: "",
};

describe("fechas", () => {
  it("calcula el día de hoy en la hora de España, no en la del servidor", () => {
    // 23:30 en UTC del 30 de octubre ya es 31 de octubre en Madrid.
    expect(hoyEn("Europe/Madrid", new Date("2026-10-30T23:30:00Z"))).toBe(
      "2026-10-31",
    );
  });

  it("suma días cambiando de mes y de año", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diasDesde("2026-10-30", 3)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("sumar días no se lía con el cambio de hora", () => {
    // En España la hora cambia el 25 de octubre de 2026.
    expect(sumarDias("2026-10-24", 1)).toBe("2026-10-25");
    expect(sumarDias("2026-10-25", 1)).toBe("2026-10-26");
  });

  it("escribe el nombre del día en español", () => {
    expect(nombreDia("2026-10-30")).toBe("viernes 30 de octubre");
  });

  it("solo acepta fechas reales", () => {
    expect(esFecha("2026-10-30")).toBe(true);
    expect(esFecha("2026-02-30")).toBe(false);
    expect(esFecha("30/10/2026")).toBe(false);
  });
});

describe("reglas de repetición", () => {
  it("crea la regla estándar para días de la semana", () => {
    expect(
      crearRegla({ tipo: "semanal", dias: ["MO", "TU", "WE"], hasta: null }),
    ).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE");
  });

  it("incluye la fecha final si la hay", () => {
    expect(crearRegla({ tipo: "diaria", hasta: "2026-12-19" })).toBe(
      "FREQ=DAILY;UNTIL=20261219T000000Z",
    );
  });

  it("lee la regla guardada para rellenar el formulario", () => {
    expect(leerRegla("FREQ=WEEKLY;BYDAY=WE,MO;UNTIL=20261219T000000Z")).toEqual(
      { tipo: "semanal", dias: ["MO", "WE"], hasta: "2026-12-19" },
    );
    expect(leerRegla(null)).toEqual({ tipo: "no" });
  });

  it("la describe en español", () => {
    expect(describirRepeticion(leerRegla(tutoria.repeat_rule))).toBe(
      "Cada lunes, martes y miércoles",
    );
    expect(describirRepeticion({ tipo: "diaria", hasta: "2026-12-19" })).toBe(
      "Cada día, hasta el 2026-12-19",
    );
  });
});

describe("fechasDelEvento", () => {
  it("un evento que no se repite solo aparece su día", () => {
    const unaVez = { start_date: "2026-11-04", repeat_rule: null };
    expect(fechasDelEvento(unaVez, "2026-11-01", "2026-11-14")).toEqual([
      "2026-11-04",
    ]);
    expect(fechasDelEvento(unaVez, "2026-11-05", "2026-11-14")).toEqual([]);
  });

  it("uno semanal aparece en sus días durante dos semanas", () => {
    expect(fechasDelEvento(tutoria, "2026-10-26", "2026-11-08")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("no aparece antes de su primer día ni después de la fecha final", () => {
    const conFinal = {
      start_date: "2026-10-28",
      repeat_rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE;UNTIL=20261102T000000Z",
    };
    expect(fechasDelEvento(conFinal, "2026-10-26", "2026-11-08")).toEqual([
      "2026-10-28",
      "2026-11-02",
    ]);
  });
});

describe("ocurrenciasEntre", () => {
  const semana = ["2026-10-26", "2026-11-01"] as const;

  it("aplica la regla y ordena por día", () => {
    const r = ocurrenciasEntre([tutoria], [], ...semana);
    expect(r.map((o) => o.fecha)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
    ]);
    expect(r[0]).toMatchObject({
      franja: "tarde",
      horaInicio: null,
      seRepite: true,
      cambiada: false,
    });
  });

  it("un día cancelado desaparece", () => {
    const cancelada: Excepcion = {
      event_id: "t1",
      on_date: "2026-10-27",
      cancelled: true,
      new_date: null,
      new_start_time: null,
      new_end_time: null,
    };
    const r = ocurrenciasEntre([tutoria], [cancelada], ...semana);
    expect(r.map((o) => o.fecha)).toEqual(["2026-10-26", "2026-10-28"]);
  });

  it("un día movido aparece en su nueva fecha y con su nueva hora", () => {
    const movida: Excepcion = {
      event_id: "t1",
      on_date: "2026-10-28",
      cancelled: false,
      new_date: "2026-10-30",
      new_start_time: "17:00",
      new_end_time: "18:00",
    };
    const r = ocurrenciasEntre([tutoria], [movida], ...semana);
    expect(r.map((o) => o.fecha)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-30",
    ]);
    expect(r[2]).toMatchObject({
      fechaOriginal: "2026-10-28",
      horaInicio: "17:00",
      cambiada: true,
    });
  });

  it("un día movido desde fuera del periodo también aparece", () => {
    const movida: Excepcion = {
      event_id: "t1",
      on_date: "2026-10-21", // miércoles de la semana anterior
      cancelled: false,
      new_date: "2026-10-29",
      new_start_time: null,
      new_end_time: null,
    };
    const conInicioAntes = { ...tutoria, start_date: "2026-10-19" };
    const r = ocurrenciasEntre([conInicioAntes], [movida], ...semana);
    expect(r.map((o) => o.fecha)).toContain("2026-10-29");
  });

  it("una clase extra es un evento que no se repite", () => {
    const extra: Evento = {
      ...tutoria,
      id: "e1",
      title: "Clase extra",
      start_date: "2026-10-29",
      start_time: "10:00",
      part_of_day: null,
      repeat_rule: null,
    };
    const r = ocurrenciasEntre([tutoria, extra], [], ...semana);
    expect(r.find((o) => o.fecha === "2026-10-29")?.titulo).toBe("Clase extra");
  });

  it("dentro de un día: sin hora primero y luego por hora o franja", () => {
    const base = { ...tutoria, repeat_rule: null, start_date: "2026-10-26" };
    const eventos: Evento[] = [
      { ...base, id: "a", title: "Noche", part_of_day: "noche" },
      {
        ...base,
        id: "b",
        title: "A las 15",
        part_of_day: null,
        start_time: "15:00",
      },
      { ...base, id: "c", title: "Sin hora", part_of_day: null },
      { ...base, id: "d", title: "Tarde", part_of_day: "tarde" },
    ];
    const r = ocurrenciasEntre(eventos, [], ...semana);
    expect(r.map((o) => o.titulo)).toEqual([
      "Sin hora",
      "Tarde",
      "A las 15",
      "Noche",
    ]);
  });

  it("agrupa por día e incluye los días vacíos", () => {
    const r = ocurrenciasEntre([tutoria], [], ...semana);
    const dias = agruparPorDia(r, diasDesde("2026-10-26", 7));
    expect(dias).toHaveLength(7);
    expect(dias[3]).toEqual({ fecha: "2026-10-29", ocurrencias: [] });
  });
});

describe("textoHora", () => {
  it("muestra la hora, la franja o que no tiene hora", () => {
    expect(
      textoHora({ horaInicio: "16:00", horaFin: "17:30", franja: null }),
    ).toBe("16:00–17:30");
    expect(
      textoHora({ horaInicio: null, horaFin: null, franja: "tarde" }),
    ).toBe("Por la tarde");
    expect(textoHora({ horaInicio: null, horaFin: null, franja: null })).toBe(
      "Sin hora",
    );
  });
});

describe("prepararEvento", () => {
  it("acepta una tutoría por la tarde sin hora exacta", () => {
    expect(prepararEvento(formulario)).toEqual({
      ok: true,
      valor: {
        title: "Tutoría",
        notes: null,
        start_date: "2026-10-26",
        start_time: null,
        end_time: null,
        part_of_day: "tarde",
        repeat_rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE",
      },
    });
  });

  it("no se inventa nada: sin hora ni franja, se queda vacío", () => {
    const r = prepararEvento({ ...formulario, part_of_day: "", repetir: "no" });
    expect(r).toMatchObject({
      ok: true,
      valor: { start_time: null, part_of_day: null, repeat_rule: null },
    });
  });

  it("con hora exacta, quita la franja", () => {
    const r = prepararEvento({ ...formulario, start_time: "16:00" });
    expect(r).toMatchObject({
      ok: true,
      valor: { start_time: "16:00", part_of_day: null },
    });
  });

  it("pide el nombre y un día válido", () => {
    expect(prepararEvento({ ...formulario, title: "  " }).ok).toBe(false);
    expect(prepararEvento({ ...formulario, start_date: "" }).ok).toBe(false);
  });

  it("revisa que las horas tengan sentido", () => {
    expect(
      prepararEvento({ ...formulario, start_time: "17:00", end_time: "16:00" }),
    ).toEqual({
      ok: false,
      error: "La hora de fin tiene que ser después de la de inicio.",
    });
    expect(prepararEvento({ ...formulario, end_time: "16:00" }).ok).toBe(false);
    expect(prepararEvento({ ...formulario, start_time: "25:00" }).ok).toBe(
      false,
    );
  });

  it("si se repite cada semana, pide los días", () => {
    expect(prepararEvento({ ...formulario, dias: [] })).toEqual({
      ok: false,
      error: "Marca qué días de la semana se repite.",
    });
  });

  it("la fecha final no puede ser antes del primer día", () => {
    expect(prepararEvento({ ...formulario, hasta: "2026-10-01" }).ok).toBe(
      false,
    );
  });
});

describe("prepararCambioDia", () => {
  it("acepta otro día y otra hora", () => {
    expect(
      prepararCambioDia({
        new_date: "2026-10-30",
        new_start_time: "17:00",
        new_end_time: "",
      }),
    ).toEqual({
      ok: true,
      valor: {
        new_date: "2026-10-30",
        new_start_time: "17:00",
        new_end_time: null,
      },
    });
  });

  it("pide el día", () => {
    expect(
      prepararCambioDia({ new_date: "", new_start_time: "", new_end_time: "" })
        .ok,
    ).toBe(false);
  });
});

describe("leerFechaParam", () => {
  it("usa la fecha de la dirección o, si no vale, hoy", () => {
    expect(leerFechaParam("2026-11-09", "2026-10-30")).toBe("2026-11-09");
    expect(leerFechaParam("mañana", "2026-10-30")).toBe("2026-10-30");
    expect(leerFechaParam(undefined, "2026-10-30")).toBe("2026-10-30");
  });
});
