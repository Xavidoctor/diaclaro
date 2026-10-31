import { describe, expect, it } from "vitest";
import {
  diaActivo,
  diaParaAbrir,
  diaVivido,
  finDelDia,
  yaTeAcostaste,
  type DatosDelDia,
} from "./dia-activo";

const base: DatosDelDia = {
  calendario: "2026-10-31",
  hora: "10:00",
  abiertoHoy: false,
  abiertoAyer: false,
  dormirAyer: null,
  dormirHoy: null,
};

describe("yaTeAcostaste", () => {
  it("una hora de noche es del mismo día", () => {
    expect(yaTeAcostaste("2026-10-30", "23:40", "2026-10-30", "23:50")).toBe(
      true,
    );
    expect(yaTeAcostaste("2026-10-30", "23:40", "2026-10-30", "23:00")).toBe(
      false,
    );
  });
  it("una hora de madrugada es del día siguiente", () => {
    expect(yaTeAcostaste("2026-10-30", "01:30", "2026-10-31", "01:00")).toBe(
      false,
    );
    expect(yaTeAcostaste("2026-10-30", "01:30", "2026-10-31", "02:00")).toBe(
      true,
    );
  });
});

describe("diaActivo", () => {
  it("si no usas los botones, el día es el del reloj", () => {
    expect(diaActivo({ ...base, hora: "01:00" })).toEqual({
      dia: "2026-10-31",
      modo: "normal",
    });
  });

  it("de madrugada, con ayer abierto y sin cerrar, sigue siendo ayer", () => {
    expect(diaActivo({ ...base, hora: "01:30", abiertoAyer: true })).toEqual({
      dia: "2026-10-30",
      modo: "trasnoche",
    });
  });

  it("si ya cerraste ayer, es el día del reloj", () => {
    expect(
      diaActivo({
        ...base,
        hora: "02:00",
        abiertoAyer: true,
        dormirAyer: "01:30",
      }),
    ).toEqual({ dia: "2026-10-31", modo: "normal" });
    expect(
      diaActivo({
        ...base,
        hora: "08:00",
        abiertoAyer: true,
        dormirAyer: "23:40",
      }).dia,
    ).toBe("2026-10-31");
  });

  it("una hora de dormir que aún no ha llegado no cierra el día", () => {
    expect(
      diaActivo({
        ...base,
        hora: "01:00",
        abiertoAyer: true,
        dormirAyer: "01:30",
      }).modo,
    ).toBe("trasnoche");
  });

  it("al pulsar Despierto hoy, empieza el día nuevo", () => {
    expect(
      diaActivo({
        ...base,
        hora: "09:00",
        abiertoAyer: true,
        abiertoHoy: true,
      }),
    ).toEqual({ dia: "2026-10-31", modo: "normal" });
  });

  it("si se te olvida cerrar, ayer acaba solo a las 12:00", () => {
    expect(diaActivo({ ...base, hora: "11:59", abiertoAyer: true }).modo).toBe(
      "trasnoche",
    );
    expect(diaActivo({ ...base, hora: "12:00", abiertoAyer: true }).modo).toBe(
      "normal",
    );
  });

  it("al irte a dormir antes de medianoche, ya toca mañana", () => {
    expect(diaActivo({ ...base, hora: "23:45", dormirHoy: "23:40" })).toEqual({
      dia: "2026-11-01",
      modo: "cerrado",
    });
  });

  it("una hora de dormir puesta antes de tiempo no cierra el día", () => {
    expect(diaActivo({ ...base, hora: "20:00", dormirHoy: "23:40" }).modo).toBe(
      "normal",
    );
    // 01:30 de esta noche es mañana de madrugada: aún no ha llegado.
    expect(diaActivo({ ...base, hora: "23:00", dormirHoy: "01:30" }).modo).toBe(
      "normal",
    );
  });
});

describe("diaParaAbrir y diaVivido", () => {
  it("de trasnoche, los botones abren el día del reloj", () => {
    const activo = { dia: "2026-10-30", modo: "trasnoche" as const };
    expect(diaParaAbrir(activo, "2026-10-31")).toBe("2026-10-31");
    expect(diaVivido(activo)).toBe("2026-10-30");
  });
  it("con el día cerrado, abres mañana y repasas hoy", () => {
    const activo = { dia: "2026-11-01", modo: "cerrado" as const };
    expect(diaParaAbrir(activo, "2026-10-31")).toBe("2026-11-01");
    expect(diaVivido(activo)).toBe("2026-10-31");
  });
});

describe("finDelDia", () => {
  const nada = { abierto: true, dormir: null, abreSiguiente: null };
  it("sin botones, acaba a medianoche", () => {
    expect(finDelDia("2026-10-30", { ...nada, abierto: false })).toBe(
      "2026-10-31 00:00",
    );
  });
  it("acaba al pulsar «Me voy a dormir», antes o después de medianoche", () => {
    expect(finDelDia("2026-10-30", { ...nada, dormir: "23:40" })).toBe(
      "2026-10-30 23:40",
    );
    expect(finDelDia("2026-10-30", { ...nada, dormir: "01:30" })).toBe(
      "2026-10-31 01:30",
    );
  });
  it("sin cerrar, acaba al abrir el día siguiente o a las 12:00", () => {
    expect(finDelDia("2026-10-30", { ...nada, abreSiguiente: "09:10" })).toBe(
      "2026-10-31 09:10",
    );
    expect(finDelDia("2026-10-30", nada)).toBe("2026-10-31 12:00");
  });
});
