import { describe, expect, it } from "vitest";
import { AJUSTES_INICIALES } from "./ajustes";
import {
  ajustesDelDia,
  estadoDespertar,
  leerHoraAcostarse,
  minutosEnLaCama,
  primeraRutina,
  textoEnLaCama,
  type InicioDia,
} from "./inicio-dia";
import type { Rutina, RutinaDelDia } from "./rutinas";

// Datos de ejemplo para las pruebas (no son los horarios reales de nadie).
const AJUSTES = {
  ...AJUSTES_INICIALES,
  wake_time: "08:00",
  sleep_time: "23:00",
};

describe("ajustesDelDia", () => {
  it("sin empezar el día, usa los Ajustes tal cual", () => {
    expect(ajustesDelDia(AJUSTES, null)).toEqual(AJUSTES);
  });

  it("al empezar, cuenta desde tu hora real", () => {
    const r = ajustesDelDia(AJUSTES, {
      on_date: "2026-10-30",
      awake_time: null,
      start_time: "10:12",
      sleep_time: null,
    });
    expect(r.wake_time).toBe("10:12");
    expect(r.sleep_time).toBe("23:00");
  });

  it("la hora de acostarte de ese día manda sobre la de Ajustes", () => {
    const r = ajustesDelDia(AJUSTES_INICIALES, {
      on_date: "2026-10-30",
      awake_time: null,
      start_time: "10:12",
      sleep_time: "00:30",
    });
    expect(r.sleep_time).toBe("00:30");
  });
});

describe("Despierto y Levantado", () => {
  const dia = (
    awake_time: string | null,
    start_time: string | null,
  ): InicioDia => ({
    on_date: "2026-10-30",
    awake_time,
    start_time,
    sleep_time: null,
  });

  it("el estado depende de qué botones has pulsado", () => {
    expect(estadoDespertar(null)).toBe("sin-empezar");
    expect(estadoDespertar(dia("09:50", null))).toBe("despierto");
    expect(estadoDespertar(dia("09:50", "10:12"))).toBe("levantado");
    expect(estadoDespertar(dia(null, "10:12"))).toBe("levantado");
  });

  it("solo despierto: el día cuenta desde que te despertaste", () => {
    expect(ajustesDelDia(AJUSTES, dia("09:50", null)).wake_time).toBe("09:50");
  });

  it("despierto y levantado: manda la hora de levantarte", () => {
    expect(ajustesDelDia(AJUSTES, dia("09:50", "10:12")).wake_time).toBe(
      "10:12",
    );
  });

  it("calcula el rato en la cama solo si tiene las dos horas", () => {
    expect(minutosEnLaCama(dia("09:50", "10:12"))).toBe(22);
    expect(minutosEnLaCama(dia("09:50", null))).toBeNull();
    expect(minutosEnLaCama(dia(null, "10:12"))).toBeNull();
    expect(minutosEnLaCama(dia("10:12", "09:50"))).toBeNull();
    expect(minutosEnLaCama(null)).toBeNull();
  });

  it("la frase es amable y sin juzgar", () => {
    expect(textoEnLaCama(null)).toBeNull();
    expect(textoEnLaCama(2)).toBe("Te has levantado enseguida.");
    expect(textoEnLaCama(22)).toBe(
      "Has estado 22 min en la cama antes de levantarte.",
    );
    expect(textoEnLaCama(60)).toBe(
      "Has estado 1 h en la cama antes de levantarte.",
    );
    expect(textoEnLaCama(85)).toBe(
      "Has estado 1 h 25 min en la cama antes de levantarte.",
    );
  });
});

describe("leerHoraAcostarse", () => {
  it("vacía es null; una hora válida se queda; otra cosa da error", () => {
    expect(leerHoraAcostarse("")).toEqual({ ok: true, valor: null });
    expect(leerHoraAcostarse(null)).toEqual({ ok: true, valor: null });
    expect(leerHoraAcostarse("00:30")).toEqual({ ok: true, valor: "00:30" });
    expect(leerHoraAcostarse("25:00").ok).toBe(false);
  });
});

function rutina(id: string, hechas = 0): RutinaDelDia {
  const r: Rutina = {
    id,
    title: id,
    notes: null,
    repeat_rule: null,
    times_per_day: 1,
    duration_minutes: null,
    window_start: null,
    window_end: null,
    part_of_day: null,
    active: true,
  };
  return { rutina: r, hechas, completa: hechas >= 1 };
}

describe("primeraRutina", () => {
  it("es la primera pendiente si aún no has hecho ninguna", () => {
    expect(primeraRutina([rutina("paseo"), rutina("otra")])?.rutina.id).toBe(
      "paseo",
    );
  });

  it("si ya has marcado alguna, no se enseña", () => {
    expect(primeraRutina([rutina("otra"), rutina("paseo", 1)])).toBeNull();
  });

  it("sin rutinas, nada", () => {
    expect(primeraRutina([])).toBeNull();
  });
});
