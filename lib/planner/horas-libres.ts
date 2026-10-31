import { horasAMinutos } from "./areas";
import type { Resultado } from "./bandeja";

// Barra «Horas libres a la semana» de la pantalla Áreas. Funciones puras,
// con pruebas en horas-libres.test.ts.
//
// Libres al día = 24 h − horas de sueño. A la semana, por 7.
// Si no cambias nada: 9 h de sueño → 15 h al día, 105 h a la semana.
// Comer, moverte o lo que surja también ocupa, así que la barra se pone de un
// rojizo suave a partir del 80 % (CASI_LLENO), sin textos.

export const HORAS_SUENO = 9;
export const CASI_LLENO = 80; // % a partir del que la barra avisa

export type HorasSueno = { sueno: number };

export const HORAS_SUENO_INICIALES: HorasSueno = { sueno: HORAS_SUENO };

// Minutos despierto a la semana (nunca menos de 0).
export function minutosLibresSemana({ sueno }: HorasSueno): number {
  return Math.round(Math.max(0, 24 - sueno) * 60 * 7);
}

export type BarraHoras = {
  libres: number; // minutos libres a la semana
  repartidas: number; // minutos que has dado a las áreas
  porcentaje: number; // relleno de la barra, de 0 a 100
  quedan: number; // minutos sin repartir (0 si te pasas)
  teHasPasado: number; // minutos de más (0 si no te pasas)
  casiLleno: boolean; // has repartido el 80 % o más, sin pasarte
};

export function barraHoras(libres: number, repartidas: number): BarraHoras {
  const porcentaje =
    libres > 0 ? Math.min(100, Math.round((repartidas / libres) * 100)) : 100;
  const teHasPasado = Math.max(0, repartidas - libres);
  return {
    libres,
    repartidas,
    porcentaje,
    quedan: Math.max(0, libres - repartidas),
    teHasPasado,
    casiLleno: repartidas > 0 && teHasPasado === 0 && porcentaje >= CASI_LLENO,
  };
}

// Lee lo que escribes en «Sueño» (acepta "8,5"). Vacío = 9 h.
export function prepararHorasSueno(datos: {
  sueno: string;
}): Resultado<HorasSueno> {
  const minutos = horasAMinutos(datos.sueno);
  if (Number.isNaN(minutos))
    return { ok: false, error: "Escribe las horas con números, como 8 o 8,5." };
  const sueno = minutos === null ? HORAS_SUENO : minutos / 60;
  if (sueno > 24) return { ok: false, error: "Un día tiene 24 horas." };
  return { ok: true, valor: { sueno } };
}
