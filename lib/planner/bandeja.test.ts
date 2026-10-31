import { describe, expect, it } from "vitest";
import {
  cuandoDeTarea,
  textoFechaLimite,
  agruparTareas,
  porFechaYHora,
  tareasParaHoy,
  diasConTareas,
  leerDiaParaMover,
  leerIds,
  tareasDelDia,
  textoPendienteDesde,
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
      valor: {
        title: "Estudiar",
        due_date: null,
        due_time: null,
        estimated_minutes: null,
      },
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
        due_time: null,
        estimated_minutes: 45,
      },
    });
  });

  it("acepta una hora si también hay día", () => {
    const r = prepararCambiosTarea({
      title: "Reunión",
      due_date: "2026-11-03",
      due_time: "10:00",
      estimated_minutes: "90",
    });
    expect(r.ok && r.valor.due_time).toBe("10:00");
  });

  it("pide el día si pones hora, y rechaza horas raras", () => {
    expect(
      prepararCambiosTarea({
        title: "x",
        due_date: "",
        due_time: "10:00",
        estimated_minutes: "",
      }),
    ).toEqual({ ok: false, error: "Para poner hora, elige también el día." });
    expect(
      prepararCambiosTarea({
        title: "x",
        due_date: "2026-11-03",
        due_time: "25:00",
        estimated_minutes: "",
      }).ok,
    ).toBe(false);
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

describe("textoPendienteDesde", () => {
  it("dice de ayer, de hace unos días o la fecha", () => {
    expect(textoPendienteDesde("2026-10-29", "2026-10-30")).toBe("de ayer");
    expect(textoPendienteDesde("2026-10-27", "2026-10-30")).toBe(
      "de hace 3 días",
    );
    expect(textoPendienteDesde("2026-10-23", "2026-10-30")).toBe(
      "de hace 7 días",
    );
    expect(textoPendienteDesde("2026-10-12", "2026-10-30")).toBe("del 12 oct");
  });

  it("cruza bien el cambio de mes", () => {
    expect(textoPendienteDesde("2026-10-31", "2026-11-01")).toBe("de ayer");
  });
});

describe("tareasDelDia y diasConTareas", () => {
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
  const tareas = [
    t("hecha", "2026-11-03", "2026-11-03T10:00:00Z"),
    t("pendiente", "2026-11-03"),
    t("otra", "2026-11-04"),
    t("sin", null),
  ];

  it("da las tareas de un día, con las hechas al final", () => {
    expect(tareasDelDia(tareas, "2026-11-03").map((x) => x.id)).toEqual([
      "pendiente",
      "hecha",
    ]);
  });

  it("marca solo los días con tareas sin hacer", () => {
    expect(diasConTareas(tareas).sort()).toEqual(["2026-11-03", "2026-11-04"]);
    expect(diasConTareas([t("h", "2026-11-05", "x")])).toEqual([]);
  });
});

describe("leerDiaParaMover", () => {
  it("acepta hoy y días futuros", () => {
    expect(leerDiaParaMover("2026-10-30", "2026-10-30")).toEqual({
      ok: true,
      valor: "2026-10-30",
    });
    expect(leerDiaParaMover("2026-11-15", "2026-10-30").ok).toBe(true);
  });

  it("rechaza días pasados y fechas raras", () => {
    expect(leerDiaParaMover("2026-10-29", "2026-10-30").ok).toBe(false);
    expect(leerDiaParaMover("2026-02-30", "2026-10-30").ok).toBe(false);
    expect(leerDiaParaMover(null, "2026-10-30").ok).toBe(false);
  });
});

describe("leerIds", () => {
  it("separa por comas y quita vacíos y repetidos", () => {
    expect(leerIds("a, b,,a")).toEqual(["a", "b"]);
    expect(leerIds(null)).toEqual([]);
  });
});

describe("porFechaYHora", () => {
  it("ordena por día y, el mismo día, por hora (sin hora al final)", () => {
    const t = (id: string, due_date: string, due_time: string | null) => ({
      id,
      due_date,
      due_time,
    });
    const lista = [
      t("sin-hora", "2026-11-03", null),
      t("tarde", "2026-11-03", "16:00"),
      t("otro-dia", "2026-11-02", null),
      t("manana", "2026-11-03", "09:30"),
    ];
    expect([...lista].sort(porFechaYHora).map((x) => x.id)).toEqual([
      "otro-dia",
      "manana",
      "tarde",
      "sin-hora",
    ]);
  });
});

describe("tres formas de poner una tarea", () => {
  const datos = {
    title: "Hacer el tema 1",
    due_date: "2026-11-06",
    due_time: "10:00",
    estimated_minutes: "",
  };

  it("«Con fecha límite» guarda el día sin hora", () => {
    const r = prepararCambiosTarea({ ...datos, cuando: "limite" });
    expect(r.ok && r.valor).toMatchObject({
      due_date: "2026-11-06",
      due_time: null,
      due_kind: "limite",
    });
  });

  it("«Sin día» quita el día y la hora", () => {
    const r = prepararCambiosTarea({ ...datos, cuando: "sin" });
    expect(r.ok && r.valor).toMatchObject({
      due_date: null,
      due_time: null,
      due_kind: "dia",
    });
  });

  it("«Un día» y «Con fecha límite» necesitan el día", () => {
    expect(
      prepararCambiosTarea({
        ...datos,
        due_date: "",
        due_time: "",
        cuando: "dia",
      }).ok,
    ).toBe(false);
    expect(
      prepararCambiosTarea({ ...datos, due_date: "", cuando: "limite" }).ok,
    ).toBe(false);
  });

  it("sin «cuando» no toca el tipo", () => {
    const r = prepararCambiosTarea(datos);
    expect(r.ok && "due_kind" in r.valor).toBe(false);
  });

  it("sabe de qué tipo es cada tarea", () => {
    expect(cuandoDeTarea({ due_date: null, due_kind: "limite" })).toBe("sin");
    expect(cuandoDeTarea({ due_date: "2026-11-06", due_kind: "limite" })).toBe(
      "limite",
    );
    expect(cuandoDeTarea({ due_date: "2026-11-06" })).toBe("dia");
  });

  it("las de fecha límite salen «En marcha» hasta ese día", () => {
    const hoy = "2026-11-02";
    const t = (
      title: string,
      due_date: string | null,
      due_kind: "dia" | "limite" = "dia",
    ) => ({
      title,
      due_date,
      due_kind,
      done_at: null,
      created_at: "2026-10-30T10:00:00Z",
    });
    const r = tareasParaHoy(
      [
        t("Tema 1", "2026-11-20", "limite"),
        t("Acaba hoy", hoy, "limite"),
        t("Pasado mañana", "2026-11-04"),
        t("Organizar cosas", null),
      ],
      hoy,
    );
    expect(r.enMarcha.map((x) => x.title)).toEqual(["Tema 1"]);
    expect(r.deHoy.map((x) => x.title)).toEqual(["Acaba hoy"]);
    expect(r.proximas.map((x) => x.title)).toEqual(["Pasado mañana"]);
    expect(r.sinDia.map((x) => x.title)).toEqual(["Organizar cosas"]);
  });

  it("dice cuánto queda", () => {
    expect(textoFechaLimite("2026-11-02", "2026-11-02")).toBe("Hasta hoy");
    expect(textoFechaLimite("2026-11-03", "2026-11-02")).toBe("Hasta mañana");
    expect(textoFechaLimite("2026-11-06", "2026-11-02")).toBe(
      "Hasta el 6 nov · quedan 4 días",
    );
  });
});
