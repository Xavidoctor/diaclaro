import { describe, expect, it } from "vitest";
import {
  PASOS,
  avanzar,
  empiezaSolo,
  leerEstado,
  lugarTarjeta,
  retroceder,
  textoEstado,
  trasNavegar,
} from "./recorrido";

describe("pasos del recorrido", () => {
  it("empieza y termina en Hoy", () => {
    expect(PASOS[0].ruta).toBe("/");
    expect(PASOS[PASOS.length - 1].ruta).toBe("/");
  });

  it("un paso que te manda a otra pantalla va seguido de un paso en esa pantalla", () => {
    PASOS.forEach((paso, i) => {
      if (paso.ir) expect(PASOS[i + 1].ruta).toBe(paso.ir);
    });
  });

  it("los pasos sin «ir» siguen en la misma pantalla", () => {
    PASOS.forEach((paso, i) => {
      if (!paso.ir && i + 1 < PASOS.length)
        expect(PASOS[i + 1].ruta).toBe(paso.ruta);
    });
  });
});

describe("leerEstado y textoEstado", () => {
  it("sin nada guardado, nunca lo has visto", () => {
    expect(leerEstado(null)).toEqual({ tipo: "nunca" });
  });

  it("lee el paso por el que vas", () => {
    expect(leerEstado("3")).toEqual({ tipo: "activo", paso: 3 });
    expect(textoEstado({ tipo: "activo", paso: 3 })).toBe("3");
  });

  it("lo raro o fuera de rango cuenta como hecho", () => {
    expect(leerEstado("hecho")).toEqual({ tipo: "hecho" });
    expect(leerEstado("")).toEqual({ tipo: "hecho" });
    expect(leerEstado("-1")).toEqual({ tipo: "hecho" });
    expect(leerEstado(String(PASOS.length))).toEqual({ tipo: "hecho" });
  });

  it("ida y vuelta da lo mismo", () => {
    for (const texto of [null, "hecho", "0", "5"])
      expect(textoEstado(leerEstado(texto))).toBe(texto);
  });
});

describe("empiezaSolo", () => {
  it("solo la primera vez y en Hoy", () => {
    expect(empiezaSolo({ tipo: "nunca" }, "/")).toBe(true);
    expect(empiezaSolo({ tipo: "nunca" }, "/agenda")).toBe(false);
    expect(empiezaSolo({ tipo: "hecho" }, "/")).toBe(false);
  });
});

describe("avanzar y retroceder", () => {
  it("avanza y, tras el último paso, queda hecho", () => {
    expect(avanzar({ tipo: "activo", paso: 0 })).toEqual({
      tipo: "activo",
      paso: 1,
    });
    expect(avanzar({ tipo: "activo", paso: PASOS.length - 1 })).toEqual({
      tipo: "hecho",
    });
  });

  it("no retrocede antes del primero", () => {
    expect(retroceder({ tipo: "activo", paso: 0 })).toEqual({
      tipo: "activo",
      paso: 0,
    });
    expect(retroceder({ tipo: "activo", paso: 2 })).toEqual({
      tipo: "activo",
      paso: 1,
    });
  });
});

describe("trasNavegar", () => {
  const pasoIr = PASOS.findIndex((p) => p.ir);

  it("al llegar a donde pedía el paso, pasa al siguiente", () => {
    const ir = PASOS[pasoIr].ir as string;
    expect(trasNavegar({ tipo: "activo", paso: pasoIr }, ir)).toEqual({
      tipo: "activo",
      paso: pasoIr + 1,
    });
  });

  it("si vas a otra pantalla, se queda en el mismo paso", () => {
    expect(trasNavegar({ tipo: "activo", paso: pasoIr }, "/foco")).toEqual({
      tipo: "activo",
      paso: pasoIr,
    });
    expect(trasNavegar({ tipo: "activo", paso: 0 }, "/")).toEqual({
      tipo: "activo",
      paso: 0,
    });
  });

  it("si no está activo, no hace nada", () => {
    expect(trasNavegar({ tipo: "hecho" }, "/bandeja")).toEqual({
      tipo: "hecho",
    });
  });
});

describe("lugarTarjeta", () => {
  it("pone la tarjeta en el lado contrario de lo iluminado", () => {
    expect(lugarTarjeta(700, 800)).toBe("arriba");
    expect(lugarTarjeta(100, 800)).toBe("abajo");
    expect(lugarTarjeta(null, 800)).toBe("centro");
  });
});
