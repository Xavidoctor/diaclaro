import { horasAMinutos } from "./areas";
import type { Resultado } from "./bandeja";

// Barra «Horas libres a la semana» de la pantalla Áreas. Funciones puras,
// con pruebas en horas-libres.test.ts.
//
// Libres al día = 24 h − sueño − descansos. A la semana, por 7.
// Si no cambias nada: 9 h de sueño y 4 h de descansos → 11 h al día, 77 h a la semana.

export const HORAS_SUENO = 9;
export const HORAS_DESCANSO = 4;

export type HorasDescanso = { sueno: number; descanso: number };

export const HORAS_DESCANSO_INICIALES: HorasDescanso = {
  sueno: HORAS_SUENO,
  descanso: HORAS_DESCANSO,
};

// Minutos libres a la semana (nunca menos de 0).
export function minutosLibresSemana({
  sueno,
  descanso,
}: HorasDescanso): number {
  const libresDia = Math.max(0, 24 - sueno - descanso);
  return Math.round(libresDia * 60 * 7);
}

export type BarraHoras = {
  libres: number; // minutos libres a la semana
  repartidas: number; // minutos que has dado a las áreas
  porcentaje: number; // relleno de la barra, de 0 a 100
  quedan: number; // minutos sin repartir (0 si te pasas)
  teHasPasado: number; // minutos de más (0 si no te pasas)
};

export function barraHoras(libres: number, repartidas: number): BarraHoras {
  return {
    libres,
    repartidas,
    porcentaje:
      libres > 0 ? Math.min(100, Math.round((repartidas / libres) * 100)) : 100,
    quedan: Math.max(0, libres - repartidas),
    teHasPasado: Math.max(0, repartidas - libres),
  };
}

// Lee lo que escribes en «Sueño» y «Descansos» (acepta "8,5").
// Vacío = el valor de siempre (9 y 4).
export function prepararHorasDescanso(datos: {
  sueno: string;
  descanso: string;
}): Resultado<HorasDescanso> {
  const sueno = horasAMinutos(datos.sueno);
  const descanso = horasAMinutos(datos.descanso);
  if (Number.isNaN(sueno) || Number.isNaN(descanso))
    return { ok: false, error: "Escribe las horas con números, como 8 o 8,5." };
  const valor = {
    sueno: sueno === null ? HORAS_SUENO : sueno / 60,
    descanso: descanso === null ? HORAS_DESCANSO : descanso / 60,
  };
  if (valor.sueno > 24 || valor.descanso > 24)
    return { ok: false, error: "Un día tiene 24 horas como mucho." };
  if (valor.sueno + valor.descanso > 24)
    return {
      ok: false,
      error: "Sueño y descansos juntos no pueden pasar de 24 h.",
    };
  return { ok: true, valor };
}
