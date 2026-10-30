import { describe, expect, it } from "vitest";
import {
  cambiosAlCambiarEstado,
  contarPorEstado,
  entradaCambioEstado,
  entradaSeguimientoHecho,
  esEstado,
  estaActiva,
  ordenarCandidaturas,
  ordenarHistorial,
  prepararCandidatura,
  prepararNotaHistorial,
  seguimientosPendientes,
  separarCandidaturas,
  textoEntrada,
  textoSeguimiento,
  type Candidatura,
  type EntradaHistorial,
} from "./candidaturas";

// Datos de ejemplo para las pruebas (empresas inventadas, no son de nadie).
function candidatura(cambios: Partial<Candidatura>): Candidatura {
  return {
    id: "c",
    company: "Empresa",
    role: "Puesto",
    url: null,
    status: "enviada",
    applied_on: null,
    next_follow_up: null,
    next_step: null,
    notes: null,
    created_at: "2026-10-01T10:00:00Z",
    ...cambios,
  };
}

const vacio = {
  company: "",
  role: "",
  url: "",
  status: "",
  applied_on: "",
  next_follow_up: "",
  next_step: "",
  notes: "",
};

describe("estaActiva", () => {
  it("rechazada y descartada están cerradas; el resto, activas", () => {
    expect(estaActiva({ status: "por_enviar" })).toBe(true);
    expect(estaActiva({ status: "entrevista" })).toBe(true);
    expect(estaActiva({ status: "oferta" })).toBe(true);
    expect(estaActiva({ status: "rechazada" })).toBe(false);
    expect(estaActiva({ status: "descartada" })).toBe(false);
  });
});

describe("ordenarCandidaturas", () => {
  it("pone primero las que tienen seguimiento, la más cercana arriba", () => {
    const lista = [
      candidatura({ id: "sin", created_at: "2026-10-20T00:00:00Z" }),
      candidatura({ id: "tarde", next_follow_up: "2026-11-10" }),
      candidatura({ id: "pronto", next_follow_up: "2026-11-01" }),
    ];
    expect(ordenarCandidaturas(lista).map((c) => c.id)).toEqual([
      "pronto",
      "tarde",
      "sin",
    ]);
  });

  it("sin seguimiento, la más nueva primero", () => {
    const lista = [
      candidatura({ id: "vieja", created_at: "2026-10-01T00:00:00Z" }),
      candidatura({ id: "nueva", created_at: "2026-10-25T00:00:00Z" }),
    ];
    expect(ordenarCandidaturas(lista).map((c) => c.id)).toEqual([
      "nueva",
      "vieja",
    ]);
  });
});

describe("separarCandidaturas", () => {
  it("separa activas y cerradas", () => {
    const r = separarCandidaturas([
      candidatura({ id: "a", status: "enviada" }),
      candidatura({ id: "b", status: "rechazada" }),
      candidatura({ id: "c", status: "por_enviar" }),
    ]);
    expect(r.activas.map((c) => c.id).sort()).toEqual(["a", "c"]);
    expect(r.cerradas.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("seguimientosPendientes", () => {
  const hoy = "2026-10-30";
  it("incluye los de hoy y los atrasados, no los futuros", () => {
    const r = seguimientosPendientes(
      [
        candidatura({ id: "hoy", next_follow_up: "2026-10-30" }),
        candidatura({ id: "atrasado", next_follow_up: "2026-10-27" }),
        candidatura({ id: "manana", next_follow_up: "2026-10-31" }),
        candidatura({ id: "sin" }),
      ],
      hoy,
    );
    expect(r.map((c) => c.id)).toEqual(["atrasado", "hoy"]);
  });

  it("no incluye candidaturas cerradas", () => {
    const r = seguimientosPendientes(
      [candidatura({ status: "descartada", next_follow_up: "2026-10-30" })],
      hoy,
    );
    expect(r).toEqual([]);
  });
});

describe("contarPorEstado", () => {
  it("cuenta solo los estados que tienen alguna, en el orden de siempre", () => {
    expect(
      contarPorEstado([
        { status: "entrevista" },
        { status: "enviada" },
        { status: "enviada" },
      ]),
    ).toEqual([
      { estado: "enviada", nombre: "Enviada", total: 2 },
      { estado: "entrevista", nombre: "Entrevista", total: 1 },
    ]);
  });
});

describe("textoSeguimiento", () => {
  const hoy = "2026-10-30";
  it("dice el día de forma cercana", () => {
    expect(textoSeguimiento("2026-10-30", hoy)).toBe("Hoy");
    expect(textoSeguimiento("2026-10-31", hoy)).toBe("Mañana");
    expect(textoSeguimiento("2026-10-29", hoy)).toBe("Ayer");
    expect(textoSeguimiento("2026-10-27", hoy)).toBe("Hace 3 días");
    expect(textoSeguimiento("2026-11-04", hoy)).toBe("En 5 días");
  });

  it("si queda lejos, enseña la fecha", () => {
    expect(textoSeguimiento("2026-11-12", hoy)).toBe("12 nov");
  });
});

describe("prepararCandidatura", () => {
  it("acepta lo mínimo: empresa y puesto; lo demás queda vacío", () => {
    const r = prepararCandidatura({
      ...vacio,
      company: "  Empresa X ",
      role: "Administrativo",
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        company: "Empresa X",
        role: "Administrativo",
        url: null,
        status: "por_enviar",
        applied_on: null,
        next_follow_up: null,
        next_step: null,
        notes: null,
      },
    });
  });

  it("pide empresa y puesto", () => {
    expect(prepararCandidatura({ ...vacio, role: "A" })).toEqual({
      ok: false,
      error: "Escribe el nombre de la empresa.",
    });
    expect(prepararCandidatura({ ...vacio, company: "A" })).toEqual({
      ok: false,
      error: "Escribe el puesto.",
    });
  });

  it("rechaza un estado que no existe", () => {
    const r = prepararCandidatura({
      ...vacio,
      company: "A",
      role: "B",
      status: "ganada",
    });
    expect(r.ok).toBe(false);
  });

  it("rechaza enlaces y fechas no válidos", () => {
    const base = { ...vacio, company: "A", role: "B" };
    expect(prepararCandidatura({ ...base, url: "web.com" }).ok).toBe(false);
    expect(prepararCandidatura({ ...base, applied_on: "2026-02-30" }).ok).toBe(
      false,
    );
    expect(prepararCandidatura({ ...base, url: "https://web.com/o" }).ok).toBe(
      true,
    );
  });

  it("el seguimiento no puede ser antes del envío", () => {
    const r = prepararCandidatura({
      ...vacio,
      company: "A",
      role: "B",
      applied_on: "2026-10-20",
      next_follow_up: "2026-10-10",
    });
    expect(r).toEqual({
      ok: false,
      error: "El seguimiento no puede ser antes del día que la enviaste.",
    });
  });
});

describe("cambiosAlCambiarEstado", () => {
  it("al cerrarla quita el seguimiento", () => {
    expect(cambiosAlCambiarEstado("rechazada")).toEqual({
      status: "rechazada",
      next_follow_up: null,
      next_step: null,
    });
  });

  it("en los demás estados solo cambia el estado (no inventa fechas)", () => {
    expect(cambiosAlCambiarEstado("enviada")).toEqual({ status: "enviada" });
  });
});

describe("esEstado", () => {
  it("reconoce los estados válidos", () => {
    expect(esEstado("oferta")).toBe(true);
    expect(esEstado("ganada")).toBe(false);
    expect(esEstado(3)).toBe(false);
  });
});

describe("historial", () => {
  const hoy = "2026-10-30";
  function entrada(cambios: Partial<EntradaHistorial>): EntradaHistorial {
    return {
      id: "e",
      application_id: "c",
      on_date: hoy,
      kind: "nota",
      status: null,
      note: "Algo",
      created_at: "2026-10-30T10:00:00Z",
      ...cambios,
    };
  }

  it("ordena lo más reciente arriba", () => {
    const r = ordenarHistorial([
      entrada({ id: "vieja", on_date: "2026-10-01" }),
      entrada({ id: "hoy-1", created_at: "2026-10-30T09:00:00Z" }),
      entrada({ id: "hoy-2", created_at: "2026-10-30T11:00:00Z" }),
    ]);
    expect(r.map((e) => e.id)).toEqual(["hoy-2", "hoy-1", "vieja"]);
  });

  it("escribe cada entrada de forma clara", () => {
    expect(
      textoEntrada({ kind: "estado", status: "entrevista", note: null }),
    ).toBe("Pasa a «Entrevista»");
    expect(
      textoEntrada({ kind: "seguimiento", status: null, note: "Llamar" }),
    ).toBe("Seguimiento hecho: Llamar");
    expect(
      textoEntrada({ kind: "seguimiento", status: null, note: null }),
    ).toBe("Seguimiento hecho");
    expect(
      textoEntrada({ kind: "nota", status: null, note: "Me llamaron" }),
    ).toBe("Me llamaron");
  });

  it("las entradas automáticas usan el día en que lo marcas", () => {
    expect(entradaCambioEstado("oferta", hoy)).toEqual({
      on_date: hoy,
      kind: "estado",
      status: "oferta",
      note: null,
    });
    expect(entradaSeguimientoHecho({ next_step: "Escribir" }, hoy)).toEqual({
      on_date: hoy,
      kind: "seguimiento",
      status: null,
      note: "Escribir",
    });
  });

  it("una nota necesita texto y un día que no sea futuro", () => {
    expect(prepararNotaHistorial({ on_date: hoy, note: "  " }, hoy)).toEqual({
      ok: false,
      error: "Escribe qué ha pasado.",
    });
    expect(
      prepararNotaHistorial({ on_date: "2026-10-31", note: "Hola" }, hoy).ok,
    ).toBe(false);
    expect(
      prepararNotaHistorial({ on_date: "ayer", note: "Hola" }, hoy).ok,
    ).toBe(false);
    expect(
      prepararNotaHistorial(
        { on_date: "2026-10-28", note: " Me llamaron " },
        hoy,
      ),
    ).toEqual({
      ok: true,
      valor: {
        on_date: "2026-10-28",
        kind: "nota",
        status: null,
        note: "Me llamaron",
      },
    });
  });
});
