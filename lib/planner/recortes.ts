import { sumarDias } from "./fechas";
import { minutosCorregidos, type Factor, type TipoTarea } from "./tiempos";

// Dónde recortar cuando hoy te pasas. Funciones puras, con pruebas en recortes.test.ts.
//
// Solo propone: tú aceptas, cambias o ignoras. Va por este orden y para en
// cuanto lo que ahorra cubre lo que te pasas:
//   1. Aplazar a mañana lo de tiempo personal (un hobby).
//   2. Aplazar a mañana lo de importancia baja.
//   3. Acortar a la mitad lo que dura 60 min o más (así avanzas algo).
//   4. Aplazar a mañana el resto.
// Dentro de cada paso, primero lo más largo: así hay menos cambios.
//
// Nunca toca: tareas de importancia alta, tareas con fecha dura, la agenda
// (compromisos) ni las rutinas (como los paseos del perro).

export const IMPORTANCIAS = ["alta", "normal", "baja"] as const;
export type Importancia = (typeof IMPORTANCIAS)[number];

export type TareaRecortable = {
  id: string;
  title: string;
  kind: TipoTarea;
  estimated_minutes: number | null;
  importance: Importancia | null; // null = sin indicar
  hard_deadline: boolean;
  tiempoPersonal: boolean; // su proyecto es de un área de tiempo personal
};

export type Recorte =
  | {
      tipo: "aplazar";
      tareaId: string;
      titulo: string;
      ahorro: number; // minutos que libera hoy
      nuevaFecha: string;
      motivo: string;
    }
  | {
      tipo: "acortar";
      tareaId: string;
      titulo: string;
      ahorro: number;
      nuevosMinutos: number; // los minutos previstos que quedarían
      motivo: string;
    };

export type PropuestaRecortes = {
  recortes: Recorte[];
  ahorro: number; // total que liberan todos los recortes
  faltan: number; // minutos que siguen sin caber (0 si ya cabe)
};

export const MIN_PARA_ACORTAR = 60;

// "exceso" son los minutos que te pasas hoy (lo que da calcularCarga, en positivo).
export function proponerRecortes(
  tareas: TareaRecortable[],
  exceso: number,
  hoy: string,
  factores: Partial<Record<TipoTarea, Factor>> = {},
): PropuestaRecortes {
  const manana = sumarDias(hoy, 1);
  const recortes: Recorte[] = [];
  let ahorro = 0;

  // Solo se puede recortar lo que tiene minutos, no es importante ni tiene fecha dura.
  const candidatas = tareas
    .filter(
      (t) => t.estimated_minutes && t.importance !== "alta" && !t.hard_deadline,
    )
    .map((t) => ({
      ...t,
      minutos: minutosCorregidos(t.estimated_minutes!, factores[t.kind]),
    }))
    .sort((a, b) => b.minutos - a.minutos);
  const usadas = new Set<string>();

  function aplazar(cumple: (t: TareaRecortable) => boolean, motivo: string) {
    for (const t of candidatas) {
      if (ahorro >= exceso) return;
      if (usadas.has(t.id) || !cumple(t)) continue;
      usadas.add(t.id);
      ahorro += t.minutos;
      recortes.push({
        tipo: "aplazar",
        tareaId: t.id,
        titulo: t.title,
        ahorro: t.minutos,
        nuevaFecha: manana,
        motivo,
      });
    }
  }

  function acortar() {
    for (const t of candidatas) {
      if (ahorro >= exceso) return;
      if (usadas.has(t.id) || t.minutos < MIN_PARA_ACORTAR) continue;
      usadas.add(t.id);
      // Lo previsto se queda en la mitad, redondeado a 5 min.
      const nuevosMinutos = Math.max(
        5,
        Math.round(t.estimated_minutes! / 2 / 5) * 5,
      );
      const libera =
        t.minutos - minutosCorregidos(nuevosMinutos, factores[t.kind]);
      ahorro += libera;
      recortes.push({
        tipo: "acortar",
        tareaId: t.id,
        titulo: t.title,
        ahorro: libera,
        nuevosMinutos,
        motivo: "Avanzas algo hoy y sigues mañana",
      });
    }
  }

  aplazar((t) => t.tiempoPersonal, "Es tiempo personal");
  aplazar((t) => t.importance === "baja", "Importancia baja");
  acortar();
  aplazar(() => true, "Puede esperar a mañana");

  return { recortes, ahorro, faltan: Math.max(0, exceso - ahorro) };
}

// "Aplazar a mañana (libera 45 min)" o "Dejarla en 30 min (libera 30 min)".
export function textoRecorte(r: Recorte, textoMinutos: (m: number) => string) {
  if (r.tipo === "aplazar")
    return `Pasarla a mañana (libera ${textoMinutos(r.ahorro)})`;
  return `Dejarla en ${textoMinutos(r.nuevosMinutos)} (libera ${textoMinutos(r.ahorro)})`;
}

// Lee la importancia que llega del formulario. Vacío = sin indicar.
export function leerImportancia(valor: unknown): Importancia | null {
  return IMPORTANCIAS.find((i) => i === valor) ?? null;
}
