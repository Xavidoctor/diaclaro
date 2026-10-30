import { describe, expect, it } from "vitest";
import { mensajesExplicarCarga, type DatosExplicacion } from "./explicar-carga";

// Datos de ejemplo para las pruebas (no son las tareas reales de nadie).
const base: DatosExplicacion = {
  apuntado: 300,
  libre: 240,
  diferencia: -60,
  horaAcostarse: "23:30",
  sinDuracion: 0,
  tareas: [{ title: "Repasar tema 3", minutos: 90, importancia: null }],
  propuesta: {
    recortes: [
      {
        tipo: "acortar",
        tareaId: "t1",
        titulo: "Repasar tema 3",
        ahorro: 45,
        nuevosMinutos: 45,
        motivo: "Avanzas algo hoy y sigues mañana",
      },
    ],
    ahorro: 45,
    faltan: 15,
  },
};

describe("mensajesExplicarCarga", () => {
  it("da instrucciones de no inventar nada", () => {
    const [sistema] = mensajesExplicarCarga(base);
    expect(sistema.role).toBe("system");
    expect(sistema.content).toContain("no inventes horas");
  });

  it("manda los números ya calculados por la app", () => {
    const [, usuario] = mensajesExplicarCarga(base);
    expect(usuario.content).toContain("Hoy se pasa unos 1 h.");
    expect(usuario.content).toContain("5 h por hacer y 4 h hasta las 23:30");
    expect(usuario.content).toContain(
      'Dejar "Repasar tema 3" en 45 min (libera 45 min)',
    );
    expect(usuario.content).toContain("faltarían 15 min");
  });

  it("avisa de lo que no tiene minutos", () => {
    const [, usuario] = mensajesExplicarCarga({
      ...base,
      sinDuracion: 2,
      tareas: [{ title: "Llamar", minutos: null, importancia: "baja" }],
    });
    expect(usuario.content).toContain("Hay 2 cosas de hoy sin minutos.");
    expect(usuario.content).toContain(
      "- Llamar (sin minutos, importancia baja)",
    );
  });

  it("cuando cabe, lo dice", () => {
    const [, usuario] = mensajesExplicarCarga({
      ...base,
      diferencia: 30,
      propuesta: null,
    });
    expect(usuario.content).toContain("le sobran 30 min");
    expect(usuario.content).not.toContain("Recortes");
  });

  it("no manda más de 30 tareas", () => {
    const muchas = Array.from({ length: 40 }, (_, i) => ({
      title: `T${i}`,
      minutos: 10,
      importancia: null,
    }));
    const [, usuario] = mensajesExplicarCarga({ ...base, tareas: muchas });
    expect(usuario.content).toContain("- T29 ");
    expect(usuario.content).not.toContain("- T30 ");
  });
});
