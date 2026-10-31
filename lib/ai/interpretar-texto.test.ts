import { describe, expect, it } from "vitest";
import {
  leerRespuesta,
  mensajesInterpretar,
  type ProyectoParaIA,
} from "./interpretar-texto";

// Proyectos y textos de ejemplo (inventados, solo para las pruebas).
const proyectos: ProyectoParaIA[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    nombre: "Mates",
    area: "Estudios",
  },
  { id: "22222222-2222-4222-8222-222222222222", nombre: "Web", area: "Empleo" },
];
const hoy = "2026-10-30"; // viernes

function respuesta(elementos: unknown[]) {
  return JSON.stringify({ elementos });
}

function elemento(cambios: Record<string, unknown>) {
  return {
    tipo: "tarea",
    titulo: "Algo",
    detalle: null,
    fecha: null,
    fecha_texto: null,
    hora: null,
    hora_texto: null,
    minutos: null,
    minutos_texto: null,
    proyecto: null,
    ...cambios,
  };
}

describe("mensajesInterpretar", () => {
  it("manda el calendario, los proyectos y el texto", () => {
    const [sistema, usuario] = mensajesInterpretar({
      texto: "llamar a Ana",
      hoy,
      proyectos,
    });
    expect(sistema.content).toContain("No inventes");
    expect(usuario.content).toContain(
      "2026-10-30 = viernes 30 de octubre (hoy)",
    );
    expect(usuario.content).toContain("2026-11-05 = jueves 5 de noviembre");
    expect(usuario.content).toContain("P2: Web (área Empleo)");
    expect(usuario.content).toContain("llamar a Ana");
  });
});

describe("leerRespuesta", () => {
  const datos = (texto: string) => ({ texto, hoy, proyectos });

  it("una rutina lleva los días y la hora que has escrito", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "rutina",
          titulo: "Gimnasio",
          dias: ["MO", "WE"],
          dias_texto: "los lunes y miércoles",
          hora: "07:00",
          hora_texto: "a las 7",
          fecha: "2026-11-02",
          fecha_texto: "los lunes",
          proyecto: "P1",
        }),
      ]),
      datos("Gimnasio los lunes y miércoles a las 7"),
    )!;
    expect(p).toMatchObject({
      tipo: "rutina",
      dias: ["MO", "WE"],
      hora: "07:00",
      fecha: null, // las rutinas no llevan fecha
      proyectoId: null,
    });
  });

  it("quita los días que no has dicho y deja que los elijas tú", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "habito",
          titulo: "Leer",
          dias: "todos",
          dias_texto: "cada día",
          hora: "22:00",
          hora_texto: "a las 22",
        }),
      ]),
      datos("Quiero leer más"),
    )!;
    expect(p.dias).toBeNull();
    expect(p.hora).toBeNull();
    expect(p.avisos).toContain(
      "He quitado los días: no los veo en lo que escribiste.",
    );
  });

  it("los siete días cuentan como todos", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "habito",
          titulo: "Beber agua",
          dias: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
          dias_texto: "cada día",
        }),
      ]),
      datos("Beber agua cada día"),
    )!;
    expect(p.dias).toBe("todos");
  });

  it("una meta lleva su tipo, su fecha y su proyecto", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "meta",
          titulo: "Examen de Mates",
          clase_meta: "examen",
          fecha: "2026-11-05",
          fecha_texto: "el jueves",
          proyecto: "P1",
          minutos: 60,
          minutos_texto: "1 hora",
        }),
        elemento({
          tipo: "meta",
          titulo: "Terminar la web",
          clase_meta: "rara",
        }),
      ]),
      datos("Examen de mates el jueves, 1 hora. Terminar la web"),
    )!;
    expect(p).toMatchObject({
      tipo: "meta",
      claseMeta: "examen",
      fecha: "2026-11-05",
      proyectoId: proyectos[0].id,
      minutos: null,
    });
  });

  it("acepta la fecha si está en el texto", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          titulo: "Entregar práctica",
          fecha: "2026-11-05",
          fecha_texto: "el jueves",
          proyecto: "P1",
        }),
      ]),
      datos("Entregar la práctica el Jueves"),
    )!;
    expect(p).toMatchObject({
      tipo: "tarea",
      fecha: "2026-11-05",
      proyectoId: proyectos[0].id,
      avisos: [],
    });
  });

  it("quita el día, la hora y la duración que no has escrito", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          fecha: "2026-11-02",
          fecha_texto: "el lunes",
          minutos: 60,
          minutos_texto: "una hora",
        }),
      ]),
      datos("repasar tema 3"),
    )!;
    expect(p.fecha).toBeNull();
    expect(p.minutos).toBeNull();
    expect(p.avisos).toHaveLength(2);
  });

  it("una cita sin día se queda como tarea", () => {
    const [p] = leerRespuesta(
      respuesta([elemento({ tipo: "cita", titulo: "Dentista" })]),
      datos("tengo que ir al dentista"),
    )!;
    expect(p.tipo).toBe("tarea");
    expect(p.avisos[0]).toContain("tarea");
  });

  it("una cita con día y hora del texto va completa", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "cita",
          titulo: "Tutoría",
          fecha: "2026-11-03",
          fecha_texto: "el martes",
          hora: "9:30",
          hora_texto: "a las 9:30",
          proyecto: "P1",
        }),
      ]),
      datos("tutoría el martes a las 9:30"),
    )!;
    expect(p).toMatchObject({
      tipo: "cita",
      fecha: "2026-11-03",
      hora: "09:30",
      proyectoId: null,
    });
  });

  it("no acepta horas sin números aunque estén en el texto", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "cita",
          fecha: "2026-10-31",
          fecha_texto: "mañana",
          hora: "10:00",
          hora_texto: "por la mañana",
        }),
      ]),
      datos("médico mañana por la mañana"),
    )!;
    expect(p.hora).toBeNull();
  });

  it("rechaza fechas pasadas o raras", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({ fecha: "2026-10-01", fecha_texto: "el 1 de octubre" }),
      ]),
      datos("pagar el 1 de octubre"),
    )!;
    expect(p.fecha).toBeNull();
  });

  it("ignora proyectos que no existen y elementos sin título", () => {
    const lista = leerRespuesta(
      respuesta([elemento({ proyecto: "P9" }), elemento({ titulo: "  " })]),
      datos("algo"),
    )!;
    expect(lista).toHaveLength(1);
    expect(lista[0].proyectoId).toBeNull();
  });

  it("las notas no llevan fecha ni proyecto", () => {
    const [p] = leerRespuesta(
      respuesta([
        elemento({
          tipo: "nota",
          fecha: "2026-10-31",
          fecha_texto: "mañana",
          proyecto: "P1",
        }),
      ]),
      datos("idea para mañana"),
    )!;
    expect(p).toMatchObject({ tipo: "nota", fecha: null, proyectoId: null });
  });

  it("entiende el JSON aunque venga entre ```", () => {
    const lista = leerRespuesta(
      "```json\n" + respuesta([elemento({})]) + "\n```",
      datos("algo"),
    );
    expect(lista).toHaveLength(1);
  });

  it("devuelve null si la respuesta no se entiende", () => {
    expect(leerRespuesta("No sé", datos("algo"))).toBeNull();
    expect(leerRespuesta('{"otra":1}', datos("algo"))).toBeNull();
  });

  it("no pasa de 10 elementos", () => {
    const muchos = Array.from({ length: 15 }, () => elemento({}));
    expect(leerRespuesta(respuesta(muchos), datos("x"))).toHaveLength(10);
  });
});
