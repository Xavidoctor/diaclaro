import { describe, expect, it } from "vitest";
import {
  leerImportancia,
  proponerRecortes,
  textoRecorte,
  type TareaRecortable,
} from "./recortes";
import { textoDuracion } from "./carga";

// Datos de ejemplo para las pruebas (no son las tareas reales de nadie).
function tarea(
  id: string,
  minutos: number | null,
  extra: Partial<TareaRecortable> = {},
): TareaRecortable {
  return {
    id,
    title: id,
    kind: "tarea",
    estimated_minutes: minutos,
    importance: null,
    hard_deadline: false,
    tiempoPersonal: false,
    ...extra,
  };
}

const HOY = "2026-10-30";

describe("proponerRecortes", () => {
  it("si no te pasas, no propone nada", () => {
    expect(proponerRecortes([tarea("a", 60)], 0, HOY)).toEqual({
      recortes: [],
      ahorro: 0,
      faltan: 0,
    });
  });

  it("empieza por el tiempo personal y lo pasa a mañana", () => {
    const r = proponerRecortes(
      [tarea("estudiar", 120), tarea("hobby", 45, { tiempoPersonal: true })],
      30,
      HOY,
    );
    expect(r.recortes).toEqual([
      {
        tipo: "aplazar",
        tareaId: "hobby",
        titulo: "hobby",
        ahorro: 45,
        nuevaFecha: "2026-10-31",
        motivo: "Es tiempo personal",
      },
    ]);
    expect(r.faltan).toBe(0);
  });

  it("después, lo de importancia baja", () => {
    const r = proponerRecortes(
      [tarea("normal", 30), tarea("baja", 30, { importance: "baja" })],
      20,
      HOY,
    );
    expect(r.recortes.map((x) => x.tareaId)).toEqual(["baja"]);
  });

  it("luego acorta a la mitad lo largo antes de aplazar el resto", () => {
    const r = proponerRecortes(
      [tarea("larga", 120), tarea("corta", 30)],
      50,
      HOY,
    );
    expect(r.recortes).toEqual([
      expect.objectContaining({
        tipo: "acortar",
        tareaId: "larga",
        nuevosMinutos: 60,
        ahorro: 60,
      }),
    ]);
  });

  it("y si no basta, aplaza el resto", () => {
    const r = proponerRecortes(
      [tarea("larga", 120), tarea("corta", 30)],
      80,
      HOY,
    );
    expect(r.recortes.map((x) => [x.tipo, x.tareaId])).toEqual([
      ["acortar", "larga"],
      ["aplazar", "corta"],
    ]);
    expect(r.ahorro).toBe(90);
  });

  it("nunca toca lo importante, la fecha dura ni lo que no tiene minutos", () => {
    const r = proponerRecortes(
      [
        tarea("importante", 120, { importance: "alta" }),
        tarea("examen", 120, { hard_deadline: true }),
        tarea("sin minutos", null),
      ],
      60,
      HOY,
    );
    expect(r).toEqual({ recortes: [], ahorro: 0, faltan: 60 });
  });

  it("dice cuánto sigue sin caber", () => {
    const r = proponerRecortes([tarea("a", 20)], 50, HOY);
    expect(r.faltan).toBe(30);
  });

  it("usa lo que sueles tardar de verdad", () => {
    const r = proponerRecortes(
      [tarea("a", 60, { importance: "baja" })],
      10,
      HOY,
      { tarea: { factor: 1.5, muestras: 5 } },
    );
    expect(r.recortes[0].ahorro).toBe(90);
  });
});

describe("textoRecorte", () => {
  it("explica cada recorte con minutos", () => {
    const [aplazar] = proponerRecortes([tarea("a", 45)], 10, HOY).recortes;
    expect(textoRecorte(aplazar, textoDuracion)).toBe(
      "Pasarla a mañana (libera 45 min)",
    );
    const [acortar] = proponerRecortes([tarea("b", 90)], 10, HOY).recortes;
    expect(textoRecorte(acortar, textoDuracion)).toBe(
      "Dejarla en 45 min (libera 45 min)",
    );
  });
});

describe("leerImportancia", () => {
  it("acepta alta, normal y baja; lo demás es sin indicar", () => {
    expect(leerImportancia("alta")).toBe("alta");
    expect(leerImportancia("")).toBeNull();
    expect(leerImportancia("urgente")).toBeNull();
  });
});
