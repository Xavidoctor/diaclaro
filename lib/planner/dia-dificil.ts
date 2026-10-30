import { sumarDias } from "./fechas";
import { nivel, ordenarTareas, type TareaParaPlan } from "./plan";
import { minutosCorregidos, type Factor, type TipoTarea } from "./tiempos";

// Modo "Día difícil". Funciones puras, con pruebas en dia-dificil.test.ts.
//
// Cuando el día se tuerce, la app te propone tres listas:
//   - Conservar: lo que no se mueve (fecha dura que vence hoy o ya pasó) y tu
//     prioridad número 1. También lo importante o lo de tus 3 prioridades si
//     es corto (menos de 1 h) o no tiene minutos.
//   - Reducir: lo importante o de tus 3 prioridades que dura 1 h o más. Se
//     queda en la mitad (o en un tercio si no tienes energía), para avanzar algo.
//   - Aplazar: todo lo demás, a mañana.
// La agenda y las rutinas (como los paseos del perro) no se tocan nunca.
// Solo propone: no cambia nada hasta que tú aceptas.

export const MOTIVOS = {
  tarde: "Me he levantado tarde",
  imprevisto: "Ha surgido algo",
  energia: "No tengo energía",
} as const;
export type Motivo = keyof typeof MOTIVOS;

// Lee el motivo que llega en la dirección (?motivo=tarde). Si no vale, null.
export function leerMotivo(valor: unknown): Motivo | null {
  return typeof valor === "string" && valor in MOTIVOS
    ? (valor as Motivo)
    : null;
}

export const MIN_PARA_REDUCIR = 60;

export type Conservar<T> = { tarea: T; motivo: string };
export type Reducir<T> = {
  tarea: T;
  nuevosMinutos: number; // los minutos previstos que quedarían
  ahorro: number; // minutos que libera hoy
};
export type Aplazar<T> = { tarea: T; nuevaFecha: string; ahorro: number };

export type PropuestaDiaDificil<T> = {
  conservar: Conservar<T>[];
  reducir: Reducir<T>[];
  aplazar: Aplazar<T>[];
  ahorro: number; // total de minutos que liberas hoy si aceptas todo
};

// Minutos que quedan al reducir: la mitad, o un tercio sin energía.
// Redondeado a 5 min y nunca menos de 5.
export function minutosReducidos(minutos: number, motivo: Motivo): number {
  const parte = motivo === "energia" ? 3 : 2;
  return Math.max(5, Math.round(minutos / parte / 5) * 5);
}

export function proponerDiaDificil<T extends TareaParaPlan>(
  tareas: T[],
  hoy: string,
  motivo: Motivo,
  factores: Partial<Record<TipoTarea, Factor>> = {},
): PropuestaDiaDificil<T> {
  const manana = sumarDias(hoy, 1);
  const ordenadas = ordenarTareas(tareas, hoy);
  const propuesta: PropuestaDiaDificil<T> = {
    conservar: [],
    reducir: [],
    aplazar: [],
    ahorro: 0,
  };

  ordenadas.forEach((tarea, posicion) => {
    // Lo que sueles tardar de verdad, si la app ya lo ha aprendido.
    const minutos = tarea.estimated_minutes
      ? minutosCorregidos(tarea.estimated_minutes, factores[tarea.kind])
      : 0;

    if (nivel(tarea, hoy) === 0) {
      propuesta.conservar.push({
        tarea,
        motivo: "Fecha que no se puede mover",
      });
      return;
    }
    if (posicion === 0) {
      propuesta.conservar.push({ tarea, motivo: "Tu prioridad número 1" });
      return;
    }

    const cuenta = tarea.importance === "alta" || posicion < 3;
    if (!cuenta) {
      propuesta.aplazar.push({ tarea, nuevaFecha: manana, ahorro: minutos });
      propuesta.ahorro += minutos;
      return;
    }

    if (
      !tarea.estimated_minutes ||
      tarea.estimated_minutes < MIN_PARA_REDUCIR
    ) {
      const por =
        tarea.importance === "alta"
          ? "Es importante"
          : "Es de tus 3 prioridades";
      propuesta.conservar.push({
        tarea,
        motivo: tarea.estimated_minutes
          ? `${por} y es corta`
          : `${por} (no sé cuánto dura)`,
      });
      return;
    }

    const nuevosMinutos = minutosReducidos(tarea.estimated_minutes, motivo);
    const ahorro =
      minutos - minutosCorregidos(nuevosMinutos, factores[tarea.kind]);
    propuesta.reducir.push({ tarea, nuevosMinutos, ahorro });
    propuesta.ahorro += ahorro;
  });

  return propuesta;
}
