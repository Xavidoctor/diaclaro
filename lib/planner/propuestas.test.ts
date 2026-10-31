import { describe, expect, it } from "vitest";
import { leerElementos, sumarMinutosAHora, textoGuardado } from "./propuestas";

// Simula el formulario de revisión.
function formulario(campos: Record<string, string>) {
  return (campo: string) => campos[campo] ?? null;
}

const PROYECTO = "11111111-1111-4111-8111-111111111111";

describe("leerElementos", () => {
  it("guarda solo los marcados", () => {
    const r = leerElementos(
      formulario({
        total: "2",
        "incluir-0": "si",
        "tipo-0": "tarea",
        "titulo-0": "Entregar práctica",
        "fecha-0": "2026-11-05",
        "minutos-0": "90",
        "proyecto-0": PROYECTO,
        "tipo-1": "nota",
        "titulo-1": "No marcada",
      }),
    );
    expect(r).toEqual({
      ok: true,
      valor: [
        {
          tipo: "tarea",
          title: "Entregar práctica",
          details: null,
          due_date: "2026-11-05",
          estimated_minutes: 90,
          project_id: PROYECTO,
        },
      ],
    });
  });

  it("una cita necesita día y calcula la hora de fin", () => {
    const sinDia = leerElementos(
      formulario({
        total: "1",
        "incluir-0": "si",
        "tipo-0": "cita",
        "titulo-0": "Tutoría",
      }),
    );
    expect(sinDia.ok).toBe(false);

    const r = leerElementos(
      formulario({
        total: "1",
        "incluir-0": "si",
        "tipo-0": "cita",
        "titulo-0": "Tutoría",
        "fecha-0": "2026-11-03",
        "hora-0": "16:00",
        "minutos-0": "45",
      }),
    );
    expect(r.ok && r.valor[0]).toMatchObject({
      tipo: "cita",
      start_date: "2026-11-03",
      start_time: "16:00",
      end_time: "16:45",
    });
  });

  it("una nota junta título y detalle", () => {
    const r = leerElementos(
      formulario({
        total: "1",
        "incluir-0": "si",
        "tipo-0": "nota",
        "titulo-0": "Idea",
        "detalle-0": "Usar fichas",
      }),
    );
    expect(r.ok && r.valor[0]).toEqual({
      tipo: "nota",
      body: "Idea\nUsar fichas",
    });
  });

  it("guarda una rutina con sus días y su hora", () => {
    const r = leerElementos(
      formulario({
        total: "1",
        "incluir-0": "si",
        "tipo-0": "rutina",
        "titulo-0": "Gimnasio",
        "cuando-0": "algunos",
        "dia-0-MO": "si",
        "dia-0-WE": "si",
        "hora-0": "07:00",
        "minutos-0": "60",
      }),
    );
    expect(r.ok && r.valor[0]).toMatchObject({
      tipo: "rutina",
      datos: {
        title: "Gimnasio",
        repeat_rule: expect.stringContaining("MO,WE"),
        times_per_day: 1,
        duration_minutes: 60,
        window_start: "07:00",
      },
    });
  });

  it("una rutina o un hábito necesitan saber qué días", () => {
    for (const tipo of ["rutina", "habito"]) {
      const r = leerElementos(
        formulario({
          total: "1",
          "incluir-0": "si",
          "tipo-0": tipo,
          "titulo-0": "Leer",
        }),
      );
      expect(r).toEqual({ ok: false, error: "«Leer»: elige qué días toca." });
    }
  });

  it("guarda un hábito de todos los días", () => {
    const r = leerElementos(
      formulario({
        total: "1",
        "incluir-0": "si",
        "tipo-0": "habito",
        "titulo-0": "Leer",
        "cuando-0": "todos",
      }),
    );
    expect(r.ok && r.valor[0]).toMatchObject({
      tipo: "habito",
      datos: { title: "Leer", direction: "mas", repeat_rule: null },
    });
  });

  it("una meta necesita proyecto", () => {
    const base = {
      total: "1",
      "incluir-0": "si",
      "tipo-0": "meta",
      "titulo-0": "Examen",
      "clase-0": "examen",
      "fecha-0": "2026-11-18",
    };
    expect(leerElementos(formulario(base)).ok).toBe(false);
    const r = leerElementos(formulario({ ...base, "proyecto-0": PROYECTO }));
    expect(r.ok && r.valor[0]).toEqual({
      tipo: "meta",
      proyectoId: PROYECTO,
      datos: {
        title: "Examen",
        kind: "examen",
        due_date: "2026-11-18",
        remind_at: null,
      },
    });
  });

  it("da errores claros", () => {
    const base = { total: "1", "incluir-0": "si", "tipo-0": "tarea" };
    expect(leerElementos(formulario({ ...base, "titulo-0": " " }))).toEqual({
      ok: false,
      error: "Cada elemento necesita un título.",
    });
    expect(
      leerElementos(
        formulario({ ...base, "titulo-0": "X", "minutos-0": "1,5" }),
      ).ok,
    ).toBe(false);
    expect(
      leerElementos(
        formulario({ ...base, "titulo-0": "X", "proyecto-0": "otro" }),
      ).ok,
    ).toBe(false);
    expect(leerElementos(formulario({ total: "1" }))).toEqual({
      ok: false,
      error: "Marca al menos un elemento para guardar.",
    });
  });
});

describe("sumarMinutosAHora", () => {
  it("suma y no pasa de medianoche", () => {
    expect(sumarMinutosAHora("16:00", 90)).toBe("17:30");
    expect(sumarMinutosAHora("23:30", 45)).toBeNull();
  });
});

describe("textoGuardado", () => {
  it("cuenta lo guardado", () => {
    expect(
      textoGuardado([
        { tipo: "nota", body: "a" },
        {
          tipo: "tarea",
          title: "b",
          details: null,
          due_date: null,
          estimated_minutes: null,
          project_id: null,
        },
        {
          tipo: "tarea",
          title: "c",
          details: null,
          due_date: null,
          estimated_minutes: null,
          project_id: null,
        },
      ]),
    ).toBe("Guardado: 2 tareas y 1 nota.");
  });
});
