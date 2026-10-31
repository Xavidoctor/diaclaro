// El recorrido de bienvenida: la app te va marcando dónde tocar, paso a paso.
// Solo datos y funciones puras, con pruebas en recorrido.test.ts.
// Cada paso ilumina un elemento de la pantalla que lleva data-guia="…".

export type PasoRecorrido = {
  ruta: string; // pantalla en la que está el paso
  objetivo: string | null; // valor de data-guia; null = tarjeta en el centro
  titulo: string;
  texto: string;
  // Si el paso te pide tocar un enlace: a qué pantalla lleva.
  // Al llegar a ella, el recorrido pasa solo al paso siguiente.
  ir?: string;
};

export const PASOS: PasoRecorrido[] = [
  {
    ruta: "/",
    objetivo: null,
    titulo: "Bienvenido a DíaClaro",
    texto:
      "Te enseño lo importante en un minuto. Puedes saltarlo cuando quieras y repetirlo desde Ajustes.",
  },
  {
    ruta: "/",
    objetivo: "captura",
    titulo: "Apunta lo que sea",
    texto:
      "Escribe aquí lo que se te pase por la cabeza y pulsa Enter. Se guarda en Notas y ya lo ordenarás después.",
  },
  {
    ruta: "/",
    objetivo: "despertar",
    titulo: "Empieza el día",
    texto:
      "Pulsa «Levantado» al salir de la cama. Así la app sabe cuánto tiempo te queda hoy hasta acostarte.",
  },
  {
    ruta: "/",
    objetivo: "plan",
    titulo: "Tu plan de hoy",
    texto:
      "Aquí verás por qué tarea empezar. Salen las tareas con fecha de hoy, ordenadas por importancia.",
  },
  {
    ruta: "/",
    objetivo: "menu-notas",
    titulo: "Abre tus notas",
    texto: "Toca «Notas» en el menú de abajo.",
    ir: "/bandeja",
  },
  {
    ruta: "/bandeja",
    objetivo: "menu-tareas",
    titulo: "Notas y Tareas",
    texto:
      "Aquí están tus notas. Tus tareas están en «Tareas»: toca una para ponerle fecha, importancia y minutos.",
  },
  {
    ruta: "/bandeja",
    objetivo: "menu-agenda",
    titulo: "Abre la Agenda",
    texto: "Toca «Agenda» en el menú de abajo.",
    ir: "/agenda",
  },
  {
    ruta: "/agenda",
    objetivo: "agenda-anadir",
    titulo: "Tus citas",
    texto:
      "Pulsa «Añadir» para apuntar una cita. Puede ser de una vez o repetirse algunos días.",
  },
  {
    ruta: "/agenda",
    objetivo: "menu-hoy",
    titulo: "Vuelve a Hoy",
    texto: "Toca «Hoy» en el menú de abajo.",
    ir: "/",
  },
  {
    ruta: "/",
    objetivo: "panel-estado",
    titulo: "Tu estado, perfil y ajustes",
    texto:
      "Desliza el dedo desde la derecha (o toca esta pestaña). Ahí tienes tus Áreas, tus notas, y el engranaje: tu perfil y tus ajustes, desde donde puedes repetir este recorrido. ¡Listo!",
  },
];

// Lo que se guarda en el navegador:
//   nada   → nunca lo has visto (se abre solo en Hoy)
//   "hecho" → lo terminaste o lo saltaste
//   "3"     → vas por el paso 3 (contando desde 0)
export type EstadoRecorrido =
  | { tipo: "nunca" }
  | { tipo: "hecho" }
  | { tipo: "activo"; paso: number };

export function leerEstado(texto: string | null): EstadoRecorrido {
  if (texto === null) return { tipo: "nunca" };
  const paso = Number(texto);
  if (
    texto !== "" &&
    Number.isInteger(paso) &&
    paso >= 0 &&
    paso < PASOS.length
  )
    return { tipo: "activo", paso };
  return { tipo: "hecho" };
}

export function textoEstado(estado: EstadoRecorrido): string | null {
  if (estado.tipo === "nunca") return null;
  if (estado.tipo === "hecho") return "hecho";
  return String(estado.paso);
}

// La primera vez que entras en Hoy, el recorrido empieza solo.
export function empiezaSolo(estado: EstadoRecorrido, ruta: string): boolean {
  return estado.tipo === "nunca" && ruta === "/";
}

// Al cambiar de pantalla: si el paso pedía ir justo ahí, pasa al siguiente.
export function trasNavegar(
  estado: EstadoRecorrido,
  ruta: string,
): EstadoRecorrido {
  if (estado.tipo !== "activo") return estado;
  if (PASOS[estado.paso].ir !== ruta) return estado;
  return avanzar(estado);
}

// Paso siguiente; tras el último, el recorrido queda hecho.
export function avanzar(estado: EstadoRecorrido): EstadoRecorrido {
  if (estado.tipo !== "activo") return estado;
  const siguiente = estado.paso + 1;
  return siguiente < PASOS.length
    ? { tipo: "activo", paso: siguiente }
    : { tipo: "hecho" };
}

export function retroceder(estado: EstadoRecorrido): EstadoRecorrido {
  if (estado.tipo !== "activo" || estado.paso === 0) return estado;
  return { tipo: "activo", paso: estado.paso - 1 };
}

// Dónde va la tarjeta: si lo iluminado está en la mitad de abajo de la
// pantalla, la tarjeta va arriba (y al revés), para no taparlo.
export function lugarTarjeta(
  centroObjetivo: number | null,
  altoPantalla: number,
): "arriba" | "abajo" | "centro" {
  if (centroObjetivo === null) return "centro";
  return centroObjetivo > altoPantalla / 2 ? "arriba" : "abajo";
}
