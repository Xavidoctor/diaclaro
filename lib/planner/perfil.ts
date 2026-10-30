import { z } from "zod";
import type { Resultado } from "./bandeja";

// Reglas del Perfil. Todo es opcional: lo que no pongas se queda vacío.

export type Perfil = {
  display_name: string | null;
  age: number | null;
  about: string | null;
  motto: string | null;
};

export const PERFIL_VACIO: Perfil = {
  display_name: null,
  age: null,
  about: null,
  motto: null,
};

// Frases para inspirarte. Puedes elegir una o escribir la tuya.
export const FRASES_SUGERIDAS = [
  "Poco a poco se llega lejos.",
  "Hoy, un paso. Mañana, otro.",
  "No tiene que ser perfecto, tiene que estar hecho.",
  "Lo que hago cada día cuenta más que lo que hago de vez en cuando.",
  "Voy a mi ritmo, y mi ritmo vale.",
  "Empezar es la mitad del camino.",
  "Un día malo no borra todo lo que he avanzado.",
  "Me trato con la paciencia que tendría con un amigo.",
  "Mejor hecho que pensado mil veces.",
  "Cada día es una oportunidad nueva para empezar.",
] as const;

// Texto corto opcional: quita espacios; si queda vacío, es null.
function textoOpcional(maximo: number, mensaje: string) {
  return z
    .string()
    .trim()
    .max(maximo, { error: mensaje })
    .transform((t) => (t === "" ? null : t));
}

const esquemaPerfil = z.object({
  display_name: textoOpcional(
    40,
    "El nombre puede tener como mucho 40 letras.",
  ),
  age: z
    .string()
    .trim()
    .transform((t) => (t === "" ? null : Number(t)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 120), {
      error: "La edad tiene que ser un número entre 1 y 120.",
    }),
  about: textoOpcional(80, "El dato puede tener como mucho 80 letras."),
  motto: textoOpcional(160, "La frase puede tener como mucho 160 letras."),
});

export function prepararPerfil(datos: {
  display_name: unknown;
  age: unknown;
  about: unknown;
  motto: unknown;
}): Resultado<Perfil> {
  const r = esquemaPerfil.safeParse({
    display_name: datos.display_name ?? "",
    age: datos.age ?? "",
    about: datos.about ?? "",
    motto: datos.motto ?? "",
  });
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  return { ok: true, valor: r.data };
}

// «Buenas tardes» + nombre → «Buenas tardes, Xavi». Sin nombre, solo el saludo.
export function saludoConNombre(saludo: string, nombre: string | null): string {
  const limpio = nombre?.trim();
  return limpio ? `${saludo}, ${limpio}` : saludo;
}
