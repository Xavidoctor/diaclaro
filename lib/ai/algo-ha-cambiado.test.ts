import { describe, expect, it } from "vitest";
import {
  leerCambios,
  mensajesAlgoHaCambiado,
  textoCambio,
  valorCambio,
  type EventoParaIA,
  type TareaParaIA,
} from "./algo-ha-cambiado";
import { leerCambioAceptado } from "../planner/propuestas";

// Agenda y tareas de ejemplo (inventadas, solo para las pruebas).
const hoy = "2026-10-30"; // viernes
const ID_E = "11111111-1111-4111-8111-111111111111";
const ID_T = "22222222-2222-4222-8222-222222222222";
const eventos: EventoParaIA[] = [
  {
    eventoId: ID_E,
    fechaOriginal: "2026-11-03",
    titulo: "Tutoría",
    fecha: "2026-11-03",
    hora: "16:00",
    horaFin: "17:30",
  },
];
const tareas: TareaParaIA[] = [
  { id: ID_T, titulo: "Entregar práctica", fecha: "2026-11-05" },
];
const datos = (texto: string) => ({ texto, hoy, eventos, tareas });
const respuesta = (cambios: unknown[]) => JSON.stringify({ cambios });

describe("mensajesAlgoHaCambiado", () => {
  it("manda la agenda y las tareas con códigos", () => {
    const [, usuario] = mensajesAlgoHaCambiado(datos("x"));
    expect(usuario.content).toContain(
      "E1: Tutoría, martes 3 de noviembre a las 16:00",
    );
    expect(usuario.content).toContain(
      "T1: Entregar práctica, para el jueves 5 de noviembre",
    );
  });
});

describe("leerCambios", () => {
  it("cancela un evento", () => {
    const r = leerCambios(
      respuesta([{ accion: "cancelar_evento", ref: "E1" }]),
      datos("me han cancelado la tutoría del martes"),
    )!;
    expect(r.cambios).toEqual([
      { tipo: "cancelar-evento", evento: eventos[0] },
    ]);
  });

  it("mueve un evento de hora y mantiene lo que dura", () => {
    const r = leerCambios(
      respuesta([
        {
          accion: "mover_evento",
          ref: "e1",
          nueva_hora: "18:00",
          hora_texto: "a las 18:00",
        },
      ]),
      datos("la tutoría pasa a las 18:00"),
    )!;
    expect(r.cambios[0]).toMatchObject({
      nuevaFecha: "2026-11-03",
      nuevaHora: "18:00",
      nuevaHoraFin: "19:30",
    });
  });

  it("mueve una tarea si el día está en el texto", () => {
    const r = leerCambios(
      respuesta([
        {
          accion: "mover_tarea",
          ref: "T1",
          nueva_fecha: "2026-11-06",
          fecha_texto: "al viernes que viene",
        },
      ]),
      datos("la entrega se retrasa al viernes que viene"),
    )!;
    expect(r.cambios).toEqual([
      { tipo: "mover-tarea", tarea: tareas[0], nuevaFecha: "2026-11-06" },
    ]);
  });

  it("descarta días inventados, códigos que no existen y repetidos", () => {
    const r = leerCambios(
      respuesta([
        {
          accion: "mover_tarea",
          ref: "T1",
          nueva_fecha: "2026-11-06",
          fecha_texto: "el viernes",
        },
        { accion: "cancelar_evento", ref: "E7" },
        { accion: "cancelar_evento", ref: "E1" },
        { accion: "cancelar_evento", ref: "E1" },
      ]),
      datos("no llego con la práctica y la tutoría se cancela"),
    )!;
    expect(r.cambios).toHaveLength(1);
    expect(r.descartados).toBe(2);
  });

  it("devuelve null si no se entiende", () => {
    expect(leerCambios("hola", datos("x"))).toBeNull();
  });
});

describe("valorCambio y leerCambioAceptado", () => {
  it("van y vuelven igual", () => {
    expect(
      leerCambioAceptado(
        valorCambio({
          tipo: "mover-evento",
          evento: eventos[0],
          nuevaFecha: "2026-11-04",
          nuevaHora: "18:00",
          nuevaHoraFin: "19:30",
        }),
      ),
    ).toEqual({
      tipo: "mover",
      eventoId: ID_E,
      dia: "2026-11-03",
      cambio: {
        new_date: "2026-11-04",
        new_start_time: "18:00",
        new_end_time: "19:30",
      },
    });
    expect(
      leerCambioAceptado(
        valorCambio({ tipo: "cancelar-evento", evento: eventos[0] }),
      ),
    ).toEqual({ tipo: "cancelar", eventoId: ID_E, dia: "2026-11-03" });
  });

  it("rechaza valores tocados", () => {
    expect(leerCambioAceptado("tarea|no-es-id|2026-11-06")).toBeNull();
    expect(leerCambioAceptado(`tarea|${ID_T}|mañana`)).toBeNull();
    expect(
      leerCambioAceptado(`mover|${ID_E}|2026-11-03|2026-11-04|19:00|18:00`),
    ).toBeNull();
    expect(leerCambioAceptado(`borrar|${ID_E}|2026-11-03`)).toBeNull();
  });
});

describe("textoCambio", () => {
  it("describe cada cambio", () => {
    expect(textoCambio({ tipo: "cancelar-evento", evento: eventos[0] })).toBe(
      "Cancelar «Tutoría» del martes 3 de noviembre a las 16:00",
    );
    expect(
      textoCambio({
        tipo: "mover-tarea",
        tarea: tareas[0],
        nuevaFecha: "2026-11-06",
      }),
    ).toBe("Pasar «Entregar práctica» al viernes 6 de noviembre");
  });
});
