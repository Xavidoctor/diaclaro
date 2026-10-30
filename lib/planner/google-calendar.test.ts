import { describe, expect, it } from "vitest";
import type { Ocurrencia } from "./agenda";
import {
  juntarAgendas,
  ocurrenciasDeGoogle,
  SIN_TITULO,
  type EventoGoogle,
} from "./google-calendar";

const ZONA = "Europe/Madrid";

function evento(datos: Partial<EventoGoogle>): EventoGoogle {
  return {
    id: "e1",
    calendario: "primary",
    titulo: "Dentista",
    inicio: {},
    fin: {},
    libre: false,
    ...datos,
  };
}

describe("ocurrenciasDeGoogle", () => {
  it("pasa la hora de Google a tu zona horaria", () => {
    // 15:00 en UTC son las 16:00 en Madrid (horario de invierno).
    const [o] = ocurrenciasDeGoogle(
      [
        evento({
          inicio: { dateTime: "2026-10-30T15:00:00Z" },
          fin: { dateTime: "2026-10-30T16:30:00Z" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-10-30",
    );
    expect(o).toMatchObject({
      fecha: "2026-10-30",
      horaInicio: "16:00",
      horaFin: "17:30",
      titulo: "Dentista",
      google: { libre: false },
    });
    expect(o.eventoId).toBe("google:primary:e1");
  });

  it("un evento de todo el día sale en cada día que dura, sin hora", () => {
    const lista = ocurrenciasDeGoogle(
      [
        evento({
          titulo: "Viaje",
          inicio: { date: "2026-10-30" },
          fin: { date: "2026-11-02" }, // en Google el último día no cuenta
        }),
      ],
      ZONA,
      "2026-10-01",
      "2026-11-30",
    );
    expect(lista.map((o) => o.fecha)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(lista.every((o) => o.horaInicio === null)).toBe(true);
  });

  it("parte en días un evento con hora que pasa la medianoche", () => {
    const lista = ocurrenciasDeGoogle(
      [
        evento({
          titulo: "Fiesta",
          inicio: { dateTime: "2026-10-30T22:00:00+01:00" },
          fin: { dateTime: "2026-10-31T02:00:00+01:00" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-10-31",
    );
    expect(lista.map((o) => [o.fecha, o.horaInicio, o.horaFin])).toEqual([
      ["2026-10-30", "22:00", "23:59"],
      ["2026-10-31", "00:00", "02:00"],
    ]);
  });

  it("no añade un día vacío si acaba justo a medianoche", () => {
    const lista = ocurrenciasDeGoogle(
      [
        evento({
          inicio: { dateTime: "2026-10-30T22:00:00+01:00" },
          fin: { dateTime: "2026-10-31T00:00:00+01:00" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-10-31",
    );
    expect(lista).toHaveLength(1);
  });

  it("deja fuera lo que cae fuera de los días pedidos", () => {
    const lista = ocurrenciasDeGoogle(
      [
        evento({
          inicio: { dateTime: "2026-11-05T10:00:00+01:00" },
          fin: { dateTime: "2026-11-05T11:00:00+01:00" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-11-01",
    );
    expect(lista).toEqual([]);
  });

  it("pone un título si el evento no tiene, y recuerda si está «Disponible»", () => {
    const [o] = ocurrenciasDeGoogle(
      [
        evento({
          titulo: "  ",
          libre: true,
          inicio: { date: "2026-10-30" },
          fin: { date: "2026-10-31" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-10-30",
    );
    expect(o.titulo).toBe(SIN_TITULO);
    expect(o.google).toEqual({ libre: true });
  });

  it("ignora un evento sin fechas", () => {
    expect(
      ocurrenciasDeGoogle([evento({})], ZONA, "2026-10-30", "2026-10-30"),
    ).toEqual([]);
  });
});

describe("juntarAgendas", () => {
  it("mezcla tu agenda y la de Google por día y hora", () => {
    const propia: Ocurrencia = {
      eventoId: "a",
      titulo: "Tutoría",
      fecha: "2026-10-30",
      fechaOriginal: "2026-10-30",
      horaInicio: "17:00",
      horaFin: null,
      franja: null,
      seRepite: false,
      cambiada: false,
    };
    const google = ocurrenciasDeGoogle(
      [
        evento({
          inicio: { dateTime: "2026-10-30T16:00:00+01:00" },
          fin: { dateTime: "2026-10-30T16:30:00+01:00" },
        }),
      ],
      ZONA,
      "2026-10-30",
      "2026-10-30",
    );
    expect(juntarAgendas([propia], google).map((o) => o.titulo)).toEqual([
      "Dentista",
      "Tutoría",
    ]);
  });
});
