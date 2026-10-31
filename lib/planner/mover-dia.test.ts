import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import {
  PX_POR_PASO,
  chocaCon,
  estaMovida,
  finMovido,
  horaMovida,
  leerMovimiento,
  pasosDesdePixeles,
  ratosFijos,
  rutinaEseDia,
  rutinaFija,
  rutinasSinHora,
  horasParaElegir,
  sePuedeMover,
  tieneHoraPropia,
  type MovidaRutina,
} from "./mover-dia";

// Datos de ejemplo (no son los horarios reales de nadie).
const paseo = {
  id: "r1",
  times_per_day: 1,
  times_of_day: null,
  window_start: "10:00",
  window_end: "10:30",
};

const pastilla = {
  id: "r2",
  times_per_day: 2,
  times_of_day: ["09:00", "21:00"],
  window_start: "09:00",
  window_end: null,
};

function ocurrencia(cambios: Partial<Ocurrencia>): Ocurrencia {
  return {
    eventoId: "e1",
    titulo: "Algo",
    fecha: "2026-11-02",
    fechaOriginal: "2026-11-02",
    horaInicio: "10:00",
    horaFin: null,
    franja: null,
    seRepite: false,
    cambiada: false,
    ...cambios,
  };
}

describe("mover con el dedo", () => {
  it("cada paso de dedo son 15 minutos, hacia abajo más tarde", () => {
    expect(pasosDesdePixeles(0)).toBe(0);
    expect(pasosDesdePixeles(PX_POR_PASO * 2)).toBe(2);
    expect(pasosDesdePixeles(-PX_POR_PASO)).toBe(-1);
    expect(horaMovida("10:00", 2)).toBe("10:30");
    expect(horaMovida("10:00", -3)).toBe("09:15");
  });

  it("no se sale del día", () => {
    expect(horaMovida("00:30", -10)).toBe("00:00");
    expect(horaMovida("23:00", 10)).toBe("23:45");
  });

  it("el fin se mueve con la misma duración", () => {
    expect(finMovido("10:00", "10:30", "18:00")).toBe("18:30");
    expect(finMovido("10:00", null, "18:00")).toBeNull();
    expect(finMovido("10:00", "12:00", "23:00")).toBeNull();
  });
});

describe("qué es fijo", () => {
  it("una rutina de un proyecto es fija salvo que digas lo contrario", () => {
    expect(rutinaFija({ project_id: "p1" })).toBe(true);
    expect(rutinaFija({ project_id: null })).toBe(false);
    expect(rutinaFija({ project_id: "p1", fixed_time: false })).toBe(false);
    expect(rutinaFija({ project_id: null, fixed_time: true })).toBe(true);
  });

  it("los compromisos y lo de Google nunca se mueven", () => {
    expect(sePuedeMover(ocurrencia({}))).toBe(false);
    expect(sePuedeMover(ocurrencia({ google: { libre: false } }))).toBe(false);
    expect(
      sePuedeMover(
        ocurrencia({
          bloque: { tipo: "rutina", id: "r1", hecha: false, fija: false },
        }),
      ),
    ).toBe(true);
    expect(
      sePuedeMover(
        ocurrencia({
          bloque: { tipo: "rutina", id: "r1", hecha: false, fija: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("rutina movida solo un día", () => {
  const movidas: MovidaRutina[] = [
    { routine_id: "r1", on_date: "2026-11-02", slot: 1, start_time: "18:00" },
    { routine_id: "r2", on_date: "2026-11-02", slot: 2, start_time: "22:15" },
  ];

  it("cambia el «Desde» y mantiene lo que dura", () => {
    const r = rutinaEseDia(paseo, movidas, "2026-11-02");
    expect(r.window_start).toBe("18:00");
    expect(r.window_end).toBe("18:30");
  });

  it("los otros días sigue igual", () => {
    expect(rutinaEseDia(paseo, movidas, "2026-11-03")).toBe(paseo);
  });

  it("con una hora por vez, cambia solo esa vez", () => {
    const r = rutinaEseDia(pastilla, movidas, "2026-11-02");
    expect(r.times_of_day).toEqual(["09:00", "22:15"]);
    expect(pastilla.times_of_day).toEqual(["09:00", "21:00"]);
  });

  it("sabe qué vez está movida", () => {
    expect(estaMovida(movidas, "r2", "2026-11-02", 2)).toBe(true);
    expect(estaMovida(movidas, "r2", "2026-11-02", 1)).toBe(false);
  });
});

describe("choques con lo fijo", () => {
  const fijos = [{ titulo: "Clase", inicio: "16:00", fin: "18:00" }];

  it("avisa si se pisan", () => {
    expect(chocaCon("17:30", "18:00", fijos)?.titulo).toBe("Clase");
    expect(chocaCon("17:00", null, fijos)?.titulo).toBe("Clase");
  });

  it("justo al acabar no choca", () => {
    expect(chocaCon("18:00", "18:30", fijos)).toBeNull();
    expect(chocaCon("15:30", "16:00", fijos)).toBeNull();
  });

  it("lo fijo es lo que no se mueve y no está «Disponible» en Google", () => {
    const lista = [
      ocurrencia({ titulo: "Clase", horaInicio: "16:00", horaFin: "18:00" }),
      ocurrencia({ titulo: "Libre", google: { libre: true } }),
      ocurrencia({
        titulo: "Paseo",
        bloque: { tipo: "rutina", id: "r1", hecha: false, fija: false },
      }),
      ocurrencia({ titulo: "Sin hora", horaInicio: null }),
    ];
    expect(ratosFijos(lista).map((f) => f.titulo)).toEqual(["Clase"]);
  });
});

describe("lo que llega al soltar", () => {
  const id = "3f0f6a3e-8f7e-4c51-9b55-2d3c0a5b1e11";

  it("acepta una tarea o una rutina con su vez", () => {
    expect(
      leerMovimiento({ tipo: "tarea", id, fecha: "2026-11-02", hora: "18:30" }),
    ).not.toBeNull();
    expect(
      leerMovimiento({
        tipo: "rutina",
        id,
        fecha: "2026-11-02",
        vez: 2,
        hora: "07:45",
      }),
    ).not.toBeNull();
  });

  it("rechaza horas o datos raros", () => {
    expect(
      leerMovimiento({ tipo: "tarea", id, fecha: "2026-11-02", hora: "25:00" }),
    ).toBeNull();
    expect(
      leerMovimiento({
        tipo: "rutina",
        id,
        fecha: "2026-11-02",
        hora: "10:00",
      }),
    ).toBeNull();
    expect(leerMovimiento({ tipo: "evento", id })).toBeNull();
  });
});

describe("rutinas sin hora", () => {
  // Una rutina de ejemplo: lunes, miércoles y viernes, 60 min, sin hora.
  const deporte = {
    id: "r9",
    title: "Deporte",
    times_per_day: 1,
    times_of_day: null,
    window_start: null,
    window_end: null,
    repeat_rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    active: true,
    duration_minutes: 60,
    project_id: "p1",
  };
  const lunes = "2026-11-02";
  const martes = "2026-11-03";

  it("sale los días que toca, sin hora", () => {
    expect(rutinasSinHora([deporte], lunes, [])).toEqual([
      { id: "r9", titulo: "Deporte", vez: 1, minutos: 60, project_id: "p1" },
    ]);
    expect(rutinasSinHora([deporte], martes, [])).toEqual([]);
  });

  it("si ese día le pusiste hora, ya no sale aparte y va a esa hora", () => {
    const movidas: MovidaRutina[] = [
      { routine_id: "r9", on_date: lunes, slot: 1, start_time: "19:00" },
    ];
    expect(rutinasSinHora([deporte], lunes, movidas)).toEqual([]);
    expect(rutinaEseDia(deporte, movidas, lunes).window_start).toBe("19:00");
  });

  it("las que tienen hora no salen", () => {
    expect(
      rutinasSinHora([{ ...deporte, window_start: "08:00" }], lunes, []),
    ).toEqual([]);
  });

  it("tieneHoraPropia mira cada vez", () => {
    expect(tieneHoraPropia(deporte, 1)).toBe(false);
    expect(tieneHoraPropia(paseo, 1)).toBe(true);
    expect(
      tieneHoraPropia({ ...pastilla, times_of_day: ["09:00", null] }, 2),
    ).toBe(false);
  });

  it("propone el principio de los huecos donde cabe", () => {
    const huecos = [
      { inicio: 9 * 60, fin: 9 * 60 + 30 }, // 30 min: no cabe 1 h
      { inicio: 10 * 60, fin: 17 * 60 },
      { inicio: 19 * 60, fin: 23 * 60 },
    ];
    expect(horasParaElegir(huecos, 60)).toEqual(["10:00", "19:00"]);
    expect(horasParaElegir(huecos, null, 2)).toEqual(["09:00", "10:00"]);
  });
});
