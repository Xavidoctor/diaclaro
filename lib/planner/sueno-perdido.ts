import {
  esAprovechada,
  minutosTarde,
  textoMotivo,
  type MotivoTarde,
} from "./dormir";

// «Tus noches» en Tu semana. Funciones puras, con pruebas en
// sueno-perdido.test.ts.
//
// Cada noche comparamos la hora a la que te acostaste de verdad con la que
// tenías prevista (la de ese día o la de Ajustes). Lo que te pasaste son
// horas de noche, y las separamos en dos grupos según el motivo que apuntaste:
// - aprovechadas: fueron a algo que querías (trabajo o estudios, planes).
// - aprovechables: la próxima vez podrían ir a dormir (móvil, no podía
//   dormir, otro o sin motivo).
// Si no tienes hora prevista, esa noche no se cuenta: la app no se la inventa.

export type NocheDormida = {
  on_date: string; // la noche, "2026-10-30"
  bed_time: string; // "01:30"
  prevista: string | null; // "23:00", o null si no tienes hora prevista
  late_reason: MotivoTarde | null;
  late_note: string | null;
};

export type MotivoPerdido = {
  motivo: MotivoTarde | null; // null = no apuntaste motivo
  texto: string;
  minutos: number;
  noches: number;
};

export type NotaPerdida = { on_date: string; minutos: number; texto: string };

export type GrupoNoches = {
  minutos: number;
  motivos: MotivoPerdido[]; // de más a menos tiempo; «Sin motivo» al final
};

export type SuenoPerdido = {
  total: number; // minutos
  noches: number; // noches que te acostaste más tarde
  aprovechadas: GrupoNoches;
  aprovechables: GrupoNoches;
  notas: NotaPerdida[]; // lo que escribiste, por orden de noche
  sinPrevista: number; // noches que no se pueden contar
};

export function calcularSuenoPerdido(noches: NocheDormida[]): SuenoPerdido {
  const porMotivo = new Map<MotivoTarde | null, MotivoPerdido>();
  const notas: NotaPerdida[] = [];
  let total = 0;
  let tarde = 0;
  let sinPrevista = 0;

  for (const n of [...noches].sort((a, b) =>
    a.on_date.localeCompare(b.on_date),
  )) {
    if (!n.prevista) {
      sinPrevista++;
      continue;
    }
    const minutos = minutosTarde(n.prevista, n.bed_time);
    if (minutos === 0) continue;
    total += minutos;
    tarde++;
    const fila = porMotivo.get(n.late_reason) ?? {
      motivo: n.late_reason,
      texto: textoMotivo(n.late_reason),
      minutos: 0,
      noches: 0,
    };
    fila.minutos += minutos;
    fila.noches++;
    porMotivo.set(n.late_reason, fila);
    if (n.late_note)
      notas.push({ on_date: n.on_date, minutos, texto: n.late_note });
  }

  // "Sin motivo" siempre al final; los demás, de más a menos tiempo.
  const ordenados = [...porMotivo.values()].sort((a, b) => {
    if ((a.motivo === null) !== (b.motivo === null))
      return a.motivo === null ? 1 : -1;
    return b.minutos - a.minutos;
  });
  const grupo = (aprovechada: boolean): GrupoNoches => {
    const motivos = ordenados.filter(
      (m) => esAprovechada(m.motivo) === aprovechada,
    );
    return {
      minutos: motivos.reduce((suma, m) => suma + m.minutos, 0),
      motivos,
    };
  };
  return {
    total,
    noches: tarde,
    aprovechadas: grupo(true),
    aprovechables: grupo(false),
    notas,
    sinPrevista,
  };
}
