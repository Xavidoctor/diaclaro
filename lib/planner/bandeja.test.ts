import { describe, expect, it } from "vitest";
import {
  agruparTareas,
  tareasParaHoy,
  enlaceNotas,
  limpiarBusqueda,
  ordenarNotas,
  prepararCambiosTarea,
  prepararCaptura,
  primerEnlace,
  tareaDesdeNota,
  tituloDesdeNota,
} from "./bandeja";

describe("prepararCaptura", () => {
  it("guarda el texto sin espacios de sobra", () => {
    expect(prepararCaptura("  mirar proveedores de fundas \n")).toEqual({
      ok: true,
      valor: { texto: "mirar proveedores de fundas", url: null },
    });
  });

  it("detecta un enlace dentro del texto", () => {
    const r = prepararCaptura("leer esto https://ejemplo.com/articulo?id=3.");
    expect(r).toEqual({
      ok: true,
      valor: {
        texto: "leer esto https://ejemplo.com/articulo?id=3.",
        url: "https://ejemplo.com/articulo?id=3",
      },
    });
  });

  it("rechaza un texto vacío", () => {
    expect(prepararCaptura("   ")).toEqual({
      ok: false,
      error: "Escribe algo para guardarlo.",
    });
    expect(prepararCaptura(null).ok).toBe(false);
  });

  it("rechaza un texto demasiado largo", () => {
    expect(prepararCaptura("a".repeat(10001)).ok).toBe(false);
  });
});

describe("primerEnlace", () => {
  it("devuelve null si no hay enlace", () => {
    expect(primerEnlace("comprar pienso")).toBeNull();
  });

  it("quita el paréntesis o la coma del final", () => {
    expect(primerEnlace("(ver https://drive.google.com/x)")).toBe(
      "https://drive.google.com/x",
    );
  });
});

describe("tituloDesdeNota", () => {
  it("usa la primera línea con texto", () => {
    expect(
      tituloDesdeNota("\n  Llamar a la academia \npreguntar horarios"),
    ).toBe("Llamar a la academia");
  });

  it("recorta una línea muy larga por una palabra entera", () => {
    const larga = "palabra ".repeat(30).trim();
    const titulo = tituloDesdeNota(larga);
    expect(titulo.length).toBeLessThanOrEqual(121);
    expect(titulo.endsWith("palabra…")).toBe(true);
  });
});

describe("tareaDesdeNota", () => {
  it("si la nota es una sola línea, no repite el texto en los detalles", () => {
    expect(tareaDesdeNota("Enviar CV a Mercadona")).toEqual({
      title: "Enviar CV a Mercadona",
      details: null,
    });
  });

  it("si la nota tiene más líneas, conserva el texto completo en los detalles", () => {
    const nota = "Enviar CV\nRevisar antes la carta";
    expect(tareaDesdeNota(nota)).toEqual({ title: "Enviar CV", details: nota });
  });
});

describe("prepararCambiosTarea", () => {
  it("deja vacíos la fecha y los minutos si no los escribes", () => {
    expect(
      prepararCambiosTarea({
        title: " Estudiar ",
        due_date: "",
        estimated_minutes: "",
      }),
    ).toEqual({
      ok: true,
      valor: { title: "Estudiar", due_date: null, estimated_minutes: null },
    });
  });

  it("acepta una fecha y unos minutos válidos", () => {
    expect(
      prepararCambiosTarea({
        title: "Estudiar",
        due_date: "2026-11-03",
        estimated_minutes: "45",
      }),
    ).toEqual({
      ok: true,
      valor: {
        title: "Estudiar",
        due_date: "2026-11-03",
        estimated_minutes: 45,
      },
    });
  });

  it("rechaza datos que no tienen sentido", () => {
    expect(
      prepararCambiosTarea({ title: "", due_date: "", estimated_minutes: "" })
        .ok,
    ).toBe(false);
    expect(
      prepararCambiosTarea({
        title: "x",
        due_date: "mañana",
        estimated_minutes: "",
      }).ok,
    ).toBe(false);
    expect(
      prepararCambiosTarea({ title: "x", due_date: "", estimated_minutes: "0" })
        .ok,
    ).toBe(false);
    expect(
      prepararCambiosTarea({
        title: "x",
        due_date: "",
        estimated_minutes: "dos",
      }).ok,
    ).toBe(false);
  });
});

describe("limpiarBusqueda", () => {
  it("quita espacios de sobra", () => {
    expect(limpiarBusqueda("  fundas   móvil ")).toBe("fundas móvil");
  });

  it("devuelve vacío si no es texto", () => {
    expect(limpiarBusqueda(undefined)).toBe("");
  });
});

describe("ordenarNotas", () => {
  it("pone las fijadas arriba y luego la más nueva primero", () => {
    const notas = [
      { id: "a", pinned: false, created_at: "2026-10-01T10:00:00Z" },
      { id: "b", pinned: true, created_at: "2026-09-01T10:00:00Z" },
      { id: "c", pinned: false, created_at: "2026-10-05T10:00:00Z" },
    ];
    expect(ordenarNotas(notas).map((n) => n.id)).toEqual(["b", "c", "a"]);
  });
});

describe("agruparTareas", () => {
  it("separa sin planificar, con fecha (la más cercana primero) y hechas", () => {
    const tareas = [
      {
        id: "1",
        due_date: null,
        done_at: null,
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "2",
        due_date: "2026-11-10",
        done_at: null,
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "3",
        due_date: "2026-11-02",
        done_at: null,
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "4",
        due_date: null,
        done_at: "2026-10-20T00:00:00Z",
        created_at: "2026-10-01T00:00:00Z",
      },
    ];
    const grupos = agruparTareas(tareas);
    expect(grupos.sinPlanificar.map((t) => t.id)).toEqual(["1"]);
    expect(grupos.conFecha.map((t) => t.id)).toEqual(["3", "2"]);
    expect(grupos.hechas.map((t) => t.id)).toEqual(["4"]);
  });
});

describe("enlaceNotas", () => {
  it("sin filtros, es la Bandeja", () => {
    expect(enlaceNotas({ ver: "activas", q: "", etiqueta: null })).toBe(
      "/bandeja",
    );
  });

  it("añade solo los filtros que tienen valor", () => {
    expect(enlaceNotas({ ver: "archivo", etiqueta: "año", tipo: "idea" })).toBe(
      "/bandeja?ver=archivo&etiqueta=a%C3%B1o&tipo=idea",
    );
  });
});

describe("tareasParaHoy", () => {
  const t = (
    id: string,
    due_date: string | null,
    done_at: string | null = null,
  ) => ({
    id,
    due_date,
    done_at,
    created_at: "2026-10-01T00:00:00Z",
  });

  it("separa atrasadas, de hoy y próximas, y cuenta las que no tienen fecha", () => {
    const r = tareasParaHoy(
      [
        t("vieja", "2026-10-28"),
        t("hoy", "2026-10-30"),
        t("lunes", "2026-11-02"),
        t("lejos", "2026-11-20"),
        t("sin1", null),
        t("sin2", null),
        t("hecha", "2026-10-30", "2026-10-30T09:00:00Z"),
      ],
      "2026-10-30",
    );
    expect(r.atrasadas.map((x) => x.id)).toEqual(["vieja"]);
    expect(r.deHoy.map((x) => x.id)).toEqual(["hoy"]);
    expect(r.proximas.map((x) => x.id)).toEqual(["lunes"]);
    expect(r.sinFecha).toBe(2);
  });

  it("cruza bien el cambio de mes", () => {
    const r = tareasParaHoy([t("dia1", "2026-12-01")], "2026-11-29");
    expect(r.proximas.map((x) => x.id)).toEqual(["dia1"]);
  });
});
