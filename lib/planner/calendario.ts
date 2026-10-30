import { addMonths, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { diasDesde, esFecha, sumarDias } from "./fechas";

// Ayudas para el calendario del mes de la Agenda.
// Los meses se escriben como texto "2026-11" y los días como "2026-11-04".

export type Rango = { desde: string; hasta: string };

// El mes de un día: "2026-11-04" → "2026-11".
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

// Comprueba que el texto es un mes con la forma 2026-11.
export function esMes(valor: string): boolean {
  return /^\d{4}-\d{2}$/.test(valor) && esFecha(`${valor}-01`);
}

// Mes de la dirección (?mes=2026-11), o el que se indique si no vale.
export function leerMesParam(valor: unknown, porDefecto: string): string {
  return typeof valor === "string" && esMes(valor) ? valor : porDefecto;
}

// sumarMeses("2026-12", 1) → "2027-01"
export function sumarMeses(mes: string, cuantos: number): string {
  return format(addMonths(parseISO(`${mes}-01`), cuantos), "yyyy-MM");
}

// "noviembre de 2026"
export function nombreMes(mes: string): string {
  return format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: es });
}

// Las semanas que se ven en el calendario del mes, de lunes a domingo.
// Incluye los días del mes anterior y del siguiente que completan
// la primera y la última semana (se ven más apagados).
export function semanasDelMes(mes: string): string[][] {
  const primero = `${mes}-01`;
  // getDay(): 0 es domingo. Lo pasamos a 0 = lunes.
  const huecoInicio = (parseISO(primero).getDay() + 6) % 7;
  const inicio = sumarDias(primero, -huecoInicio);
  const semanas: string[][] = [];
  let dia = inicio;
  // Se añaden semanas mientras empiecen dentro del mes (o sea la primera).
  while (semanas.length === 0 || mesDe(dia) === mes) {
    semanas.push(diasDesde(dia, 7));
    dia = sumarDias(dia, 7);
  }
  return semanas;
}

// Junta rangos de días que se tocan o están a menos de una semana,
// para pedir a Google Calendar lo mínimo sin hacer llamadas repetidas.
export function juntarRangos(rangos: Rango[], margen = 7): Rango[] {
  const ordenados = [...rangos].sort((a, b) => a.desde.localeCompare(b.desde));
  const juntos: Rango[] = [];
  for (const r of ordenados) {
    const ultimo = juntos.at(-1);
    if (ultimo && r.desde <= sumarDias(ultimo.hasta, margen)) {
      if (r.hasta > ultimo.hasta) ultimo.hasta = r.hasta;
    } else {
      juntos.push({ ...r });
    }
  }
  return juntos;
}
