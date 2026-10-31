import { describe, expect, it } from "vitest";
import { calcularSuenoPerdido, type NocheDormida } from "./sueno-perdido";

const noche = (n: Partial<NocheDormida>): NocheDormida => ({
  on_date: "2026-10-26",
  bed_time: "23:00",
  prevista: "23:00",
  late_reason: null,
  late_note: null,
  ...n,
});

describe("calcularSuenoPerdido", () => {
  it("suma lo que te acostaste más tarde y lo reparte por motivo", () => {
    const r = calcularSuenoPerdido([
      noche({
        on_date: "2026-10-27",
        bed_time: "01:00",
        late_reason: "trabajo",
      }),
      noche({
        on_date: "2026-10-26",
        bed_time: "00:00",
        late_reason: "pantallas",
        late_note: "una serie",
      }),
      noche({
        on_date: "2026-10-28",
        bed_time: "00:30",
        late_reason: "trabajo",
      }),
      noche({ on_date: "2026-10-29", bed_time: "23:30" }),
    ]);
    expect(r.total).toBe(120 + 60 + 90 + 30);
    expect(r.noches).toBe(4);
    expect(r.aprovechadas.minutos).toBe(210);
    expect(
      r.aprovechadas.motivos.map((m) => [m.texto, m.minutos, m.noches]),
    ).toEqual([["Trabajo o estudios", 210, 2]]);
    expect(r.aprovechables.minutos).toBe(90);
    expect(r.aprovechables.motivos.map((m) => m.texto)).toEqual([
      "Móvil, series o juegos",
      "Sin motivo",
    ]);
    expect(r.notas).toEqual([
      { on_date: "2026-10-26", minutos: 60, texto: "una serie" },
    ]);
  });

  it("no cuenta las noches en que te acostaste a tu hora o antes", () => {
    const r = calcularSuenoPerdido([
      noche({ bed_time: "22:30", late_reason: "otro" }),
      noche({ bed_time: "23:00" }),
    ]);
    expect(r).toMatchObject({
      total: 0,
      noches: 0,
      aprovechadas: { minutos: 0, motivos: [] },
      aprovechables: { minutos: 0, motivos: [] },
    });
  });

  it("sin hora prevista no se inventa nada", () => {
    const r = calcularSuenoPerdido([
      noche({ bed_time: "02:00", prevista: null, late_reason: "planes" }),
    ]);
    expect(r).toMatchObject({ total: 0, noches: 0, sinPrevista: 1 });
  });
});
