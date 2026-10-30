import { describe, expect, it } from "vitest";
import {
  apuntesDeRutinas,
  dentroDeMeta,
  leerSemanas,
  lunesDe,
  resumenPorSemanas,
  conRecordatorio,
  esIdea,
  habitosDelDia,
  horaCorta,
  pendientesALaHora,
  textoRecordatorio,
  numero,
  prepararApunte,
  prepararHabito,
  resumenSemana,
  textoCantidad,
  textoMeta,
  textoTendencia,
  totalDelDia,
  type Habito,
  type RegistroHabito,
} from "./habitos";

// Datos de ejemplo para las pruebas (no son los datos reales de nadie).
const tabaco: Habito = {
  id: "h1",
  title: "Tabaco",
  notes: null,
  direction: "menos",
  unit: "cigarrillos",
  daily_target: 10,
  repeat_rule: null,
  routine_id: null,
  remind_at: null,
  active: true,
};

const gimnasio: Habito = {
  id: "h2",
  title: "Gimnasio",
  notes: null,
  direction: "mas",
  unit: null,
  daily_target: null,
  repeat_rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  routine_id: null,
  remind_at: null,
  active: true,
};

const apunte = (
  habit_id: string,
  on_date: string,
  amount = 1,
): RegistroHabito => ({ habit_id, on_date, amount });

describe("totalDelDia", () => {
  it("suma lo apuntado ese día", () => {
    const r = [apunte("h1", "2026-10-30", 3), apunte("h1", "2026-10-30", 2)];
    expect(totalDelDia(r, "h1", "2026-10-30")).toBe(5);
  });

  it("sin apuntes es null, no 0", () => {
    expect(totalDelDia([], "h1", "2026-10-30")).toBeNull();
  });

  it("un apunte de 0 cuenta como 0", () => {
    expect(
      totalDelDia([apunte("h1", "2026-10-30", 0)], "h1", "2026-10-30"),
    ).toBe(0);
  });
});

describe("habitosDelDia", () => {
  it("solo los activos que tocan ese día", () => {
    // 2026-10-30 es viernes; 2026-10-31, sábado.
    const pausado = { ...tabaco, id: "h3", active: false };
    const lista = [tabaco, gimnasio, pausado];
    expect(
      habitosDelDia(lista, [], "2026-10-30").map((h) => h.habito.id),
    ).toEqual(["h1", "h2"]);
    expect(
      habitosDelDia(lista, [], "2026-10-31").map((h) => h.habito.id),
    ).toEqual(["h1"]);
  });
});

describe("textos", () => {
  it("numero redondea a un decimal con coma", () => {
    expect(numero(8.25)).toBe("8,3");
    expect(numero(7)).toBe("7");
  });

  it("textoCantidad usa la unidad o veces", () => {
    expect(textoCantidad(3, "cigarrillos")).toBe("3 cigarrillos");
    expect(textoCantidad(1, null)).toBe("1 vez");
    expect(textoCantidad(2, null)).toBe("2 veces");
  });

  it("textoMeta según hacia dónde quieres ir", () => {
    expect(textoMeta(tabaco)).toBe("Meta: como mucho 10 cigarrillos al día");
    expect(textoMeta({ ...gimnasio, daily_target: 1 })).toBe(
      "Meta: al menos 1 vez al día",
    );
    expect(textoMeta(gimnasio)).toBe("Quiero hacerlo más");
  });
});

describe("dentroDeMeta", () => {
  it("con menos, como mucho la meta", () => {
    expect(dentroDeMeta(tabaco, 10)).toBe(true);
    expect(dentroDeMeta(tabaco, 11)).toBe(false);
  });

  it("sin apuntes o sin meta no se valora", () => {
    expect(dentroDeMeta(tabaco, null)).toBeNull();
    expect(dentroDeMeta(gimnasio, 3)).toBeNull();
  });
});

describe("resumenSemana", () => {
  const hoy = "2026-10-30";
  const registros = [
    apunte("h1", "2026-10-30", 8),
    apunte("h1", "2026-10-29", 12),
    // Semana anterior
    apunte("h1", "2026-10-20", 14),
    apunte("h1", "2026-10-18", 10),
  ];

  it("cuenta solo los días con apuntes", () => {
    const r = resumenSemana(tabaco, registros, hoy);
    expect(r.dias).toHaveLength(7);
    expect(r.dias[0].fecha).toBe("2026-10-24");
    expect(r.dias[6]).toEqual({ fecha: hoy, total: 8 });
    expect(r.diasConApuntes).toBe(2);
    expect(r.media).toBe(10);
    expect(r.mediaAnterior).toBe(12);
    expect(r.diasEnMeta).toBe(1);
  });

  it("sin meta no cuenta días en meta", () => {
    expect(resumenSemana(gimnasio, [], hoy).diasEnMeta).toBeNull();
  });

  it("sin apuntes no hay media", () => {
    const r = resumenSemana(tabaco, [], hoy);
    expect(r.media).toBeNull();
    expect(r.diasConApuntes).toBe(0);
  });
});

describe("textoTendencia", () => {
  it("faltan datos: no dice nada", () => {
    expect(
      textoTendencia({ media: 5, mediaAnterior: null }, "menos"),
    ).toBeNull();
  });

  it("parecido si la diferencia es pequeña", () => {
    expect(textoTendencia({ media: 10, mediaAnterior: 10.4 }, "menos")).toBe(
      "Parecido a la semana anterior (10,4 → 10 al día de media)",
    );
  });

  it("si vas hacia donde querías, lo dice", () => {
    expect(textoTendencia({ media: 8, mediaAnterior: 12 }, "menos")).toBe(
      "Menos que la semana anterior (12 → 8 al día de media). Vas hacia donde querías.",
    );
  });

  it("si no, solo describe, sin juzgar", () => {
    expect(textoTendencia({ media: 12, mediaAnterior: 8 }, "menos")).toBe(
      "Más que la semana anterior (8 → 12 al día de media)",
    );
  });
});

describe("prepararHabito", () => {
  const formulario = {
    title: "Tabaco",
    notes: "",
    direction: "menos",
    unit: "cigarrillos",
    daily_target: "",
    cuando: "todos",
    dias: [],
  };

  it("sin meta es válido (la app no se la inventa)", () => {
    const r = prepararHabito(formulario);
    expect(r).toEqual({
      ok: true,
      valor: {
        title: "Tabaco",
        notes: null,
        direction: "menos",
        unit: "cigarrillos",
        daily_target: null,
        repeat_rule: null,
        routine_id: null,
        remind_at: null,
      },
    });
  });

  it("guarda la meta y los días", () => {
    const r = prepararHabito({
      ...formulario,
      daily_target: "10",
      cuando: "algunos",
      dias: ["FR", "MO"],
    });
    expect(r.ok && r.valor.daily_target).toBe(10);
    expect(r.ok && r.valor.repeat_rule).toBe("FREQ=WEEKLY;BYDAY=MO,FR");
  });

  it("si solo quieres verlo, quita la meta", () => {
    const r = prepararHabito({
      ...formulario,
      direction: "observar",
      daily_target: "7",
    });
    expect(r.ok && r.valor.daily_target).toBeNull();
  });

  it("guarda la rutina unida y rechaza ids raros", () => {
    const id = "6f1c2a1e-1b2c-4d3e-8f90-123456789abc";
    const r = prepararHabito({ ...formulario, routine_id: id });
    expect(r.ok && r.valor.routine_id).toBe(id);
    expect(prepararHabito({ ...formulario, routine_id: "hola" }).ok).toBe(
      false,
    );
  });

  it("pide nombre y días", () => {
    expect(prepararHabito({ ...formulario, title: " " }).ok).toBe(false);
    expect(prepararHabito({ ...formulario, cuando: "algunos" }).ok).toBe(false);
    expect(prepararHabito({ ...formulario, daily_target: "-1" }).ok).toBe(
      false,
    );
  });
});

describe("prepararApunte", () => {
  it("vacío es 1", () => {
    expect(prepararApunte({ amount: "", note: "" })).toEqual({
      ok: true,
      valor: { amount: 1, note: null },
    });
  });

  it("admite 0 y una nota", () => {
    expect(prepararApunte({ amount: "0", note: " tranquilo " })).toEqual({
      ok: true,
      valor: { amount: 0, note: "tranquilo" },
    });
  });

  it("rechaza negativos y decimales", () => {
    expect(prepararApunte({ amount: "-2", note: "" }).ok).toBe(false);
    expect(prepararApunte({ amount: "1.5", note: "" }).ok).toBe(false);
  });
});

describe("esIdea", () => {
  it("solo las ideas conocidas", () => {
    expect(esIdea("leer")).toBe(true);
    expect(esIdea("toString")).toBe(false);
    expect(esIdea(null)).toBe(false);
  });
});

describe("apuntesDeRutinas", () => {
  it("cada «Hecho» de la rutina unida cuenta como 1", () => {
    const unido = { ...gimnasio, routine_id: "r1" };
    const r = apuntesDeRutinas(
      [tabaco, unido],
      [
        { routine_id: "r1", on_date: "2026-10-30" },
        { routine_id: "r1", on_date: "2026-10-30" },
        { routine_id: "r2", on_date: "2026-10-30" },
      ],
    );
    expect(r).toEqual([
      { habit_id: "h2", on_date: "2026-10-30", amount: 1 },
      { habit_id: "h2", on_date: "2026-10-30", amount: 1 },
    ]);
    expect(totalDelDia(r, "h2", "2026-10-30")).toBe(2);
  });
});

describe("resumenPorSemanas", () => {
  it("lunes de la semana", () => {
    expect(lunesDe("2026-10-30")).toBe("2026-10-26");
    expect(lunesDe("2026-10-26")).toBe("2026-10-26");
    expect(lunesDe("2026-11-01")).toBe("2026-10-26");
  });

  it("semanas de la más nueva a la más vieja; la actual, hasta hoy", () => {
    const registros = [
      apunte("h1", "2026-10-30", 8),
      apunte("h1", "2026-10-27", 12),
      apunte("h1", "2026-10-20", 14),
    ];
    const r = resumenPorSemanas(tabaco, registros, "2026-10-30", 3);
    expect(r.map((s) => s.lunes)).toEqual([
      "2026-10-26",
      "2026-10-19",
      "2026-10-12",
    ]);
    expect(r[0]).toEqual({
      lunes: "2026-10-26",
      dias: 5,
      diasConApuntes: 2,
      total: 20,
      media: 10,
      diasEnMeta: 1,
    });
    expect(r[1].dias).toBe(7);
    expect(r[2].media).toBeNull();
  });

  it("sin meta no cuenta días en meta", () => {
    expect(
      resumenPorSemanas(gimnasio, [], "2026-10-30", 1)[0].diasEnMeta,
    ).toBeNull();
  });
});

describe("leerSemanas", () => {
  it("solo las opciones conocidas; si no, 4", () => {
    expect(leerSemanas("13")).toBe(13);
    expect(leerSemanas("99")).toBe(4);
    expect(leerSemanas(undefined)).toBe(4);
  });
});

describe("recordatorios", () => {
  const conHora = (h: Habito, remind_at: string): Habito => ({
    ...h,
    remind_at,
  });

  it("horaCorta quita los segundos que devuelve la base de datos", () => {
    expect(horaCorta("21:00:00")).toBe("21:00");
    expect(horaCorta("08:30")).toBe("08:30");
  });

  it("solo recuerda lo que tiene hora y aún no tiene nada apuntado", () => {
    const fumar = conHora(tabaco, "21:00:00");
    const agua = { ...conHora(gimnasio, "10:00:00"), id: "h3", repeat_rule: null };
    const deHoy = habitosDelDia(
      [fumar, agua, gimnasio],
      [apunte("h3", "2026-10-30", 2)],
      "2026-10-30",
    );
    // gimnasio no tiene hora; agua ya tiene algo apuntado.
    expect(conRecordatorio(deHoy).map((h) => h.id)).toEqual(["h1"]);
  });

  it("«Hoy, ninguno» (0) también cuenta como apuntado", () => {
    const deHoy = habitosDelDia(
      [conHora(tabaco, "21:00:00")],
      [apunte("h1", "2026-10-30", 0)],
      "2026-10-30",
    );
    expect(conRecordatorio(deHoy)).toEqual([]);
  });

  it("no recuerda un hábito pausado ni uno que hoy no toca", () => {
    const pausado = { ...conHora(tabaco, "09:00"), active: false };
    // 2026-10-31 es sábado y el gimnasio toca lunes, miércoles y viernes.
    const deSabado = habitosDelDia(
      [pausado, conHora(gimnasio, "09:00")],
      [],
      "2026-10-31",
    );
    expect(conRecordatorio(deSabado)).toEqual([]);
  });

  it("sale desde su hora, no antes, y en orden de hora", () => {
    const noche = conHora(tabaco, "21:00:00");
    const manana = { ...conHora(gimnasio, "08:00:00"), id: "h3" };
    expect(pendientesALaHora([noche, manana], "07:59")).toEqual([]);
    expect(pendientesALaHora([noche, manana], "08:00")).toEqual([manana]);
    expect(pendientesALaHora([noche, manana], "23:10")).toEqual([
      manana,
      noche,
    ]);
  });

  it("textoRecordatorio", () => {
    expect(textoRecordatorio(conHora(tabaco, "21:00:00"))).toBe(
      "Recordatorio a las 21:00",
    );
    expect(textoRecordatorio(tabaco)).toBeNull();
  });

  it("prepararHabito guarda la hora sin segundos y la deja vacía si no hay", () => {
    const base = {
      title: "Tabaco",
      notes: "",
      direction: "menos",
      unit: "",
      daily_target: "",
      cuando: "todos",
      dias: [],
    };
    const r1 = prepararHabito({ ...base, remind_at: "21:30" });
    expect(r1.ok && r1.valor.remind_at).toBe("21:30");
    const r2 = prepararHabito({ ...base, remind_at: "07:05:00" });
    expect(r2.ok && r2.valor.remind_at).toBe("07:05");
    const r3 = prepararHabito({ ...base, remind_at: "" });
    expect(r3.ok && r3.valor.remind_at).toBeNull();
    expect(prepararHabito({ ...base, remind_at: "25:00" })).toEqual({
      ok: false,
      error: "La hora del recordatorio no es válida.",
    });
  });
});
