import { describe, expect, it } from "vitest";
import {
  conocerte,
  franjaDe,
  horaMedia,
  textoFactor,
  type SesionConHora,
} from "./conocerte";
import type { HorasDelDia, ResumenProgreso } from "./progreso";

const sinMedia = { total: 0, dias: 0, media: null };
const resumenVacio: ResumenProgreso = {
  sueno: sinMedia,
  enCama: sinMedia,
  enPie: sinMedia,
  usado: sinMedia,
  agenda: sinMedia,
  sinApuntar: sinMedia,
};

function horas(
  levantado: string | null,
  acostarse: string | null,
): HorasDelDia {
  return {
    fecha: "2026-10-20",
    despierto: null,
    levantado,
    acostarse,
    acostarseReal: acostarse !== null,
  };
}

// La hora local es la misma que la del texto (para no depender de la zona).
const horaLocal = (instante: string) => instante.slice(11, 16);

function base() {
  return {
    factores: {},
    resumen: resumenVacio,
    horas: [] as HorasDelDia[],
    sesiones: [] as SesionConHora[],
    horaLocal,
    diasDificiles: [],
  };
}

describe("franjaDe", () => {
  it("parte el día en mañana, tarde y noche", () => {
    expect(franjaDe("06:00")).toBe("mañana");
    expect(franjaDe("13:59")).toBe("mañana");
    expect(franjaDe("14:00")).toBe("tarde");
    expect(franjaDe("21:00")).toBe("noche");
    expect(franjaDe("02:00")).toBe("noche");
  });
});

describe("horaMedia", () => {
  it("redondea al cuarto de hora y no cuenta los vacíos", () => {
    expect(horaMedia(["10:00", "10:20", null])).toEqual({
      hora: "10:15",
      dias: 2,
    });
    expect(horaMedia([null])).toBeNull();
  });

  it("de noche, la madrugada cuenta como el día siguiente", () => {
    expect(horaMedia(["23:30", "00:30"], true)).toEqual({
      hora: "00:00",
      dias: 2,
    });
  });
});

describe("textoFactor", () => {
  it("describe sin juzgar", () => {
    expect(textoFactor(1.4)).toBe(
      "Sueles tardar un 40 % más de lo que calculas.",
    );
    expect(textoFactor(2.5)).toBe(
      "Sueles tardar unas 2,5 veces lo que calculas.",
    );
    expect(textoFactor(1.05)).toBe("Calculas bien lo que tardas.");
    expect(textoFactor(0.8)).toBe(
      "Sueles acabar antes de lo que calculas (un 20 % menos).",
    );
  });
});

describe("conocerte", () => {
  it("sin datos no dice nada y explica qué le falta", () => {
    const r = conocerte(base());
    expect(r.rasgos).toEqual([]);
    expect(r.pendientes.map((p) => p.id)).toEqual([
      "ritmo",
      "sueno",
      "horario",
      "foco",
    ]);
  });

  it("cuenta lo que tardas con tu factor", () => {
    const r = conocerte({
      ...base(),
      factores: { tarea: { factor: 1.4, muestras: 12 } },
    });
    expect(r.rasgos[0]).toMatchObject({
      id: "ritmo",
      texto: "Sueles tardar un 40 % más de lo que calculas.",
    });
    expect(r.rasgos[0].deDonde).toContain("12 tareas");
  });

  it("habla de tu horario solo con 5 días o más", () => {
    const pocos = conocerte({
      ...base(),
      horas: Array(4).fill(horas("10:00", "01:00")),
    });
    expect(pocos.rasgos.find((x) => x.id === "horario")).toBeUndefined();

    const r = conocerte({
      ...base(),
      horas: Array(5).fill(horas("10:00", "01:00")),
    });
    expect(r.rasgos.find((x) => x.id === "horario")?.texto).toBe(
      "Normalmente te levantas hacia las 10:00 y te acuestas hacia las 01:00.",
    );
  });

  it("dice cuándo te concentras más", () => {
    const r = conocerte({
      ...base(),
      sesiones: [
        { started_at: "2026-10-20T16:00:00Z", minutes: 50 },
        { started_at: "2026-10-21T17:00:00Z", minutes: 40 },
        { started_at: "2026-10-22T10:00:00Z", minutes: 20 },
      ],
    });
    expect(r.rasgos.find((x) => x.id === "foco")?.texto).toBe(
      "Te concentras más por la tarde: ahí va el 82 % de tu tiempo de Foco.",
    );
  });

  it("los días difíciles salen a partir de 2", () => {
    expect(conocerte({ ...base(), diasDificiles: ["energia"] }).rasgos).toEqual(
      [],
    );
    const r = conocerte({
      ...base(),
      diasDificiles: ["energia", "tarde", "energia"],
    });
    expect(r.rasgos[0].texto).toBe(
      "Has tenido 3 en las últimas 4 semanas. Lo que más se repite: «No tengo energía».",
    );
  });
});
