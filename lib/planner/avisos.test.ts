import { describe, expect, it } from "vitest";
import {
  aBase64Url,
  cabeceraValida,
  clavePublicaValida,
  contenidoAviso,
  deBase64Url,
  leerPeticionAviso,
  leerSuscripcion,
  sqlGuardarSecreto,
} from "./avisos";

// Datos de ejemplo para las pruebas (no son los datos reales de nadie).
const secreto = "a".repeat(64);
const peticion = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  p256dh: "clave",
  auth: "auth",
  habito: "6a1b2c3d-1234-4abc-8def-0123456789ab",
  titulo: "Café",
  hora: "21:00",
};

describe("cabeceraValida", () => {
  it("acepta la contraseña correcta", () => {
    expect(cabeceraValida(`Bearer ${secreto}`, secreto)).toBe(true);
  });

  it("rechaza otra contraseña, ninguna o una sin configurar", () => {
    expect(cabeceraValida(`Bearer ${"b".repeat(64)}`, secreto)).toBe(false);
    expect(cabeceraValida(null, secreto)).toBe(false);
    expect(cabeceraValida("Bearer ", undefined)).toBe(false);
    expect(cabeceraValida(`Bearer ${secreto}x`, secreto)).toBe(false);
  });

  it("no vale una contraseña demasiado corta", () => {
    expect(cabeceraValida("Bearer corta", "corta")).toBe(false);
  });
});

describe("leerPeticionAviso", () => {
  it("acepta lo que manda Supabase", () => {
    expect(leerPeticionAviso(peticion)).toEqual({ ok: true, valor: peticion });
  });

  it("rechaza datos incompletos o raros", () => {
    expect(leerPeticionAviso({ ...peticion, hora: "9:00" }).ok).toBe(false);
    expect(leerPeticionAviso({ ...peticion, habito: "x" }).ok).toBe(false);
    expect(leerPeticionAviso(null).ok).toBe(false);
  });
});

describe("contenidoAviso", () => {
  it("es amable, con el nombre y la hora", () => {
    expect(contenidoAviso(peticion)).toEqual({
      title: "Café",
      body: "Recordatorio de las 21:00. Hoy aún no has apuntado nada. ¿Lo apuntas?",
      tag: `habito-${peticion.habito}`,
      url: `/habitos#habito-${peticion.habito}`,
    });
  });

  it("si trae una de tus frases, la pone primero", () => {
    const c = contenidoAviso({ ...peticion, frase: "Un vaso más y listo" });
    expect(c.body).toBe("Un vaso más y listo\nRecordatorio de las 21:00.");
  });

  it("acepta la frase vacía (null) que manda Supabase si no tienes", () => {
    expect(leerPeticionAviso({ ...peticion, frase: null }).ok).toBe(true);
    expect(leerPeticionAviso({ ...peticion, frase: "x".repeat(201) }).ok).toBe(
      false,
    );
  });
});

describe("avisos de rutinas con foco", () => {
  const { habito: _sinHabito, ...base } = peticion;
  void _sinHabito;
  const deRutina = {
    ...base,
    rutina: "7b2c3d4e-1234-4abc-8def-0123456789ab",
    titulo: "Estudiar",
    hora: "16:00",
    minutos: 10,
  };

  it("acepta un aviso de rutina", () => {
    expect(leerPeticionAviso(deRutina)).toEqual({ ok: true, valor: deRutina });
  });

  it("tiene que ser de un hábito o de una rutina, no de los dos ni de ninguno", () => {
    expect(leerPeticionAviso(base).ok).toBe(false);
    expect(leerPeticionAviso({ ...deRutina, habito: peticion.habito }).ok).toBe(
      false,
    );
  });

  it("dice cuánto falta y abre Foco con esa rutina", () => {
    expect(contenidoAviso(deRutina)).toEqual({
      title: "En 10 min: Estudiar",
      body: "Empieza a las 16:00. Ve terminando lo que estés haciendo y prepárate.",
      tag: `rutina-${deRutina.rutina}`,
      url: `/foco?rutina=${deRutina.rutina}`,
    });
  });
});

describe("avisos de metas de proyectos", () => {
  const { habito: _sinHabito, ...base } = peticion;
  void _sinHabito;
  const meta = "8c3d4e5f-1234-4abc-8def-0123456789ab";
  const ruta =
    "/areas/9d4e5f60-1234-4abc-8def-0123456789ab/proyectos/0e5f6071-1234-4abc-8def-0123456789ab";
  const deMeta = {
    ...base,
    meta,
    titulo: "Parcial",
    hora: "09:00",
    tipo: "examen" as const,
    proyecto: "Asignatura de ejemplo",
    ruta,
    dias: 3,
  };

  it("acepta un aviso de meta, y pide la ruta del proyecto", () => {
    expect(leerPeticionAviso(deMeta)).toEqual({ ok: true, valor: deMeta });
    expect(leerPeticionAviso({ ...deMeta, ruta: undefined }).ok).toBe(false);
    expect(leerPeticionAviso({ ...deMeta, ruta: "https://otra.web" }).ok).toBe(
      false,
    );
  });

  it("no puede ser a la vez de una meta y de un hábito", () => {
    expect(leerPeticionAviso({ ...deMeta, habito: peticion.habito }).ok).toBe(
      false,
    );
  });

  it("dice el tipo, el proyecto y cuánto falta, y abre el proyecto", () => {
    expect(contenidoAviso(deMeta)).toEqual({
      title: "Examen: Parcial",
      body: "Asignatura de ejemplo · Faltan 3 días.",
      tag: `meta-${meta}`,
      url: `${ruta}#meta-${meta}`,
    });
    expect(contenidoAviso({ ...deMeta, dias: 1 }).body).toContain("mañana");
    expect(contenidoAviso({ ...deMeta, dias: 0 }).body).toContain("hoy");
    expect(
      contenidoAviso({ ...deMeta, tipo: "entrega", dias: null }),
    ).toMatchObject({
      title: "Entrega: Parcial",
      body: "Asignatura de ejemplo",
    });
  });
});

describe("leerSuscripcion", () => {
  it("convierte lo que da el navegador", () => {
    expect(
      leerSuscripcion({
        endpoint: peticion.endpoint,
        expirationTime: null,
        keys: { p256dh: "p", auth: "a" },
      }),
    ).toEqual({
      ok: true,
      valor: { endpoint: peticion.endpoint, p256dh: "p", auth: "a" },
    });
  });

  it("rechaza direcciones sin https o sin claves", () => {
    expect(
      leerSuscripcion({
        endpoint: "http://ejemplo.com",
        keys: { p256dh: "p", auth: "a" },
      }).ok,
    ).toBe(false);
    expect(leerSuscripcion({ endpoint: peticion.endpoint }).ok).toBe(false);
  });
});

describe("base64url", () => {
  it("va y vuelve sin perder nada", () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
    const texto = aBase64Url(bytes);
    expect(texto).not.toMatch(/[+/=]/);
    expect([...deBase64Url(texto)]).toEqual([...bytes]);
  });

  it("clavePublicaValida pide 65 bytes", () => {
    expect(clavePublicaValida(aBase64Url(new Uint8Array(65)))).toBe(true);
    expect(clavePublicaValida(aBase64Url(new Uint8Array(32)))).toBe(false);
    expect(clavePublicaValida(undefined)).toBe(false);
    expect(clavePublicaValida("no válida!")).toBe(false);
  });
});

it("sqlGuardarSecreto", () => {
  expect(sqlGuardarSecreto("abc")).toBe(
    "select vault.create_secret('abc', 'diaclaro_avisos');",
  );
});
