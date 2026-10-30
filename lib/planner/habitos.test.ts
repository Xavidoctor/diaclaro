import { describe, expect, it } from "vitest";
import {
  dentroDeMeta,
  esIdea,
  habitosDelDia,
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
    expect(totalDelDia([apunte("h1", "2026-10-30", 0)], "h1", "2026-10-30")).toBe(0);
  });
});

describe("habitosDelDia", () => {
  it("solo los activos que tocan ese día", () => {
    // 2026-10-30 es viernes; 2026-10-31, sábado.
    const pausado = { ...tabaco, id: "h3", active: false };
    const lista = [tabaco, gimnasio, pausado];
    expect(habitosDelDia(lista, [], "2026-10-30").map((h) => h.habito.id)).toEqual(
      ["h1", "h2"],
    );
    expect(habitosDelDia(lista, [], "2026-10-31").map((h) => h.habito.id)).toEqual(
      ["h1"],
    );
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
    expect(textoTendencia({ media: 5, mediaAnterior: null }, "menos")).toBeNull();
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

  it("pide nombre y días", () => {
    expect(prepararHabito({ ...formulario, title: " " }).ok).toBe(false);
    expect(prepararHabito({ ...formulario, cuando: "algunos" }).ok).toBe(false);
    expect(prepararHabito({ ...formulario, daily_target: "-1" }).ok).toBe(false);
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
    expect(esIdea("tabaco")).toBe(true);
    expect(esIdea("toString")).toBe(false);
    expect(esIdea(null)).toBe(false);
  });
});
