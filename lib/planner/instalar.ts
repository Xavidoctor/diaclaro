// Cómo instalar DíaClaro en cada aparato. Funciones puras, con pruebas en
// instalar.test.ts. La pantalla está en app/instalar.

export type Aparato = "iphone" | "android" | "ordenador";

// Adivina el aparato por el «user agent» del navegador.
// El iPad moderno dice que es un Mac, pero los Mac no tienen pantalla táctil:
// por eso miramos también cuántos dedos admite la pantalla.
export function detectarAparato(
  userAgent: string,
  puntosTactiles = 0,
): Aparato {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iphone";
  if (ua.includes("macintosh") && puntosTactiles > 1) return "iphone";
  if (ua.includes("android")) return "android";
  return "ordenador";
}

export type Guia = {
  aparato: Aparato;
  titulo: string;
  pasos: string[];
  nota?: string;
};

export const GUIAS: Record<Aparato, Guia> = {
  iphone: {
    aparato: "iphone",
    titulo: "iPhone o iPad",
    pasos: [
      "Abre diaclaro.vercel.app en Safari.",
      "Toca el botón Compartir (el cuadrado con una flecha hacia arriba).",
      "Baja y toca «Añadir a pantalla de inicio».",
      "Toca «Añadir». Ya tienes el icono de DíaClaro.",
      "Ábrela desde el icono y entra con tu email y el código que te llega.",
    ],
    nota: "En el iPhone, la app instalada no comparte la sesión con Safari: por eso, dentro de la app, entra con el código del email en lugar del enlace.",
  },
  android: {
    aparato: "android",
    titulo: "Android",
    pasos: [
      "Abre diaclaro.vercel.app en Chrome.",
      "Toca «Instalar» aquí arriba o, si no sale, el menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio»).",
      "Confirma. DíaClaro aparece con tus otras apps y se abre sin la barra del navegador.",
    ],
    nota: "Si ya habías entrado en Chrome, la app instalada ya tiene tu sesión abierta.",
  },
  ordenador: {
    aparato: "ordenador",
    titulo: "Ordenador",
    pasos: [
      "Abre diaclaro.vercel.app en Chrome o Edge.",
      "Pulsa «Instalar» aquí arriba, o el icono de instalar que sale a la derecha de la barra de direcciones.",
      "Si no lo ves: en Chrome, menú ⋮ → «Transmitir, guardar y compartir» → «Instalar página como aplicación»; en Edge, menú … → «Aplicaciones» → «Instalar este sitio como aplicación».",
      "DíaClaro se abre en su propia ventana y puedes anclarla a la barra de tareas o al Dock.",
    ],
    nota: "En un Mac con Safari: menú Archivo → «Añadir al Dock». Firefox no permite instalarla: usa Chrome o Edge.",
  },
};

// Las guías en orden: primero la del aparato que estás usando.
export function guiasEnOrden(actual: Aparato): Guia[] {
  const orden: Aparato[] = ["iphone", "android", "ordenador"];
  return [actual, ...orden.filter((a) => a !== actual)].map((a) => GUIAS[a]);
}
